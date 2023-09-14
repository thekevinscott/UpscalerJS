import { CommentTag, SignatureReflection, TypeParameterReflection } from "typedoc";
import { isInstrinsicType, isReferenceType, isUnionType } from "../types.js";
import { getReferenceTypeOfParameter } from "./get-reference-type-of-parameter.js";

export const getReturnType = (signatures: (SignatureReflection & { typeParameter?: TypeParameterReflection[] })[], blockTags?: Record<string, CommentTag['content']>) => {
  if (signatures.length === 1) {
    const { type } = signatures[0];
    if (type === undefined) {
      return 'void';
    }

    if (isReferenceType(type)) {
      const { name, typeArguments } = type;
      let nameOfType = name;
      if (typeArguments?.length) {
        nameOfType = `${nameOfType}<${typeArguments.map(t => getReferenceTypeOfParameter(t)).map(({ name }) => name).join(', ')}>`;
      }
      const returnDescription = blockTags?.['@returns']?.map(({ text }) => text).join('');
      return `\`${nameOfType}\`${returnDescription ? ` - ${returnDescription}` : ''}`;
    }

    if (isInstrinsicType(type)) {
      const nameOfType = type.name;
      const returnDescription = blockTags?.['@returns']?.map(({ text }) => text).join('');
      return `\`${nameOfType}\`${returnDescription ? ` - ${returnDescription}` : ''}`;
    }

    throw new Error(`Return Type function not yet implemented for type ${type.type}`)
  }

  let comment: Comment;
  const validReturnTypes = new Set();
  let returnType = '';
  signatures.forEach(signature => {
    if (signature.comment) {
      if (comment !== undefined) {
        throw new Error('Multiple comments defined for return signatures');
      }
      comment = signature.comment as any;
    }
    const { type } = signature;
    if (type === undefined) {
      throw new Error('No type defined for signature');
    }
    if (!isReferenceType(type)) {
      throw new Error(`Unsupported type: ${type.type}`);
    }
    if (returnType !== '' && returnType !== type.name) {
      throw new Error(`Conflicting return types in signatures: ${returnType} vs ${type.name}}`)
    }
    returnType = type.name;
    if (!('typeArguments' in type)) {
      throw new Error('No type arguments defined for type');
    }
    const { typeArguments } = type;
    typeArguments?.forEach(type => {
      if (isUnionType(type)) {
        type.types.forEach(t => {
          if (isInstrinsicType(t) || isReferenceType(t)) {
            validReturnTypes.add(t.name);
          } else {
            throw new Error(`Unsupported type when trying to handle union type while collecting valid signatures: ${type.type} ${t.type}`);
          }
        });
      } else if (isInstrinsicType(type)) {
        validReturnTypes.add(type.name);
      } else if (isReferenceType(type)) {
        validReturnTypes.add(type.name);
      } else {
        throw new Error(`Unsupported type when trying to collect valid signatures: ${type.type}`);
      }
    });
  })

  const nameOfType = `${returnType}<${Array.from(validReturnTypes).join(' | ')}>`;
  const returnDescription = blockTags?.['@returns']?.map(({ text }) => text).join('');
  return `\`${nameOfType}\`${returnDescription ? ` - ${returnDescription}` : ''}`;
};
