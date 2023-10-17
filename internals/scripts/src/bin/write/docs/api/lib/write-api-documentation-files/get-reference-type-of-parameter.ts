import { SomeType, UnionType } from "typedoc";
import { Definitions, getLiteralTypeValue, isArrayType, isDeclarationReflection, isInstrinsicType, isIntersectionType, isLiteralType, isReferenceType, isUnionType } from "../types.js";
import { info, warn } from "@internals/common/logger";

export const getReferenceTypeOfParameter = (_type?: SomeType, definitions?: Definitions): {
  type: 'reference' | 'array' | 'literal' | 'intrinsic' | 'union',
  name: string;
  includeURL?: boolean;
} => {
  if (!_type) {
    throw new Error('Define a type');
  }
  if (isArrayType(_type)) {
    const { elementType } = _type;
    if (isReferenceType(elementType)) {
      return {
        type: _type.type,
        name: elementType.name,
      }
    } else if (isUnionType(elementType)) {
      return {
        type: 'union',
        name: elementType.types.map(t => {
          if ('name' in t) {
            return t.name;
          }
          throw new Error('unimplemented');
        }).join(' | '),
      };
    }

    throw new Error('Not yet implemented');
  }

  if (isReferenceType(_type)) {
    const { name } = _type;
    if (name === 'ModelDefinitionObjectOrFn') {
      return {
        type: _type.type,
        name: "ModelDefinition",
      };
    }
    return {
      type: _type.type,
      name,
    };
  }

  if (isLiteralType(_type)) {
    return {
      type: 'literal',
      name: getLiteralTypeValue(_type),
    };
  }

  if (isInstrinsicType(_type)) {
    return {
      type: 'intrinsic',
      name: _type.name,
    }
  }

  if (isIntersectionType(_type)) {
    const refType = _type.types.filter(t => t.type === 'reference').pop();
    if (!refType || !isReferenceType(refType)) {
      throw new Error('No reference type found on intersection type.');
    }
    // if (definitions === undefined) {
    //   throw new Error('Intersection type was provided and a reference type was found in the union, but no definitions are present.')
    // }
    const intersectionType = refType.typeArguments?.filter(t => t.type === 'reference').pop();
    if (!intersectionType || !('name' in intersectionType)) {
      throw new Error('No type arguments found on intersection type.');
    }
    return {
      type: 'literal',
      name: intersectionType.name,
    };
  }

  if (isUnionType(_type)) {
    let includeURL = true;

    const getNameFromUnionType = (type: UnionType): string => type.types.map(t => {
      if (isReferenceType(t)) {
        if (definitions === undefined) {
          warn('Union type was provided and a reference type was found in the union, but no definitions are present.');
          return t.name;
        }
        const { interfaces, types } = definitions;
        const matchingType = interfaces[t.name] || types[t.name];
        if (!isDeclarationReflection(matchingType)) {
          throw new Error('Is a platform specific type');
        }
        if (!matchingType?.type) {
          return t.name;
          // throw new Error(`No matching type found for literal ${t.name} in union`);
        }
        const matchingTypeType = matchingType.type;
        if (isLiteralType(matchingTypeType)) {
          // if any literal types are included, don't include the URL
          includeURL = false;
          return JSON.stringify(matchingTypeType.value);
        }
        if (matchingTypeType.type === 'reflection') {
          // Ignore reflection types
          return t.name;
        }
        if (matchingTypeType.type === 'union') {
          return getNameFromUnionType(matchingTypeType);
        }
        if (matchingTypeType.type === 'tuple') {
          info('matchingTypeType tuple', matchingTypeType);
          return `[${matchingTypeType.elements?.map(e => {
            if ('name' in e) {
              return e.name;
            }
            throw new Error('Array type not yet implemented');
          }).join(',')}]`;
        }
        throw new Error(`Unsupported type of matching type ${matchingTypeType.type} in reference type of union type ${t.name}.`);
      } else if (isInstrinsicType(t)) {
        if (t.name === 'undefined') {
          // ignore an explicit undefined type; this should be better represented to the user as an optional flag.
          return undefined;
        }
        return t.name;
      } else if (isLiteralType(t)) {
        return `${t.value}`;
      } else if (t.type === 'indexedAccess') {
        const objectType = t.objectType;
        if ('name' in objectType) {
          return objectType.name;
        }
        return '';
      } else if (t.type === 'array') {
        if ('name' in t.elementType) {
          return `${t.elementType.name}[]`;
        }
        warn('Unknown element type', t);
        // throw new Error('Unknown element type');
        return '';
      }
      throw new Error(`Unsupported type in union type: ${t.type}`);
    }).filter(Boolean).join(' | ');

    const name = getNameFromUnionType(_type);

    return {
      type: 'literal',
      includeURL,
      name,
    };
  }

  throw new Error(`Unsupported type: ${_type.type}`)
};
