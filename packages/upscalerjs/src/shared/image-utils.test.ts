import { getPatchesFromImage } from "./image-utils";
import { Coordinate, Patch } from "./types";

interface PartialPatch {
  pre?: Partial<Patch['pre']>;
  post?: Partial<Patch['post']>;
}

type TestCase = [
  string, // test name
  Coordinate, // image size
  number, // patch size
  number, // padding
  Patch[][], // expectation
];

describe('getPatchesFromImage', () => {
  const buildTestCaseExpectation = (
    patches: PartialPatch[][],
    {
      pre: globalPre = {},
      post: globalPost = {}
    }: PartialPatch = {}
  ): Patch[][] => patches.map(row => {
    return row.map(({ pre = {}, post = {} }) => {
      return {
        pre: {
          ...globalPre,
          ...pre,
        },
        post: {
          ...globalPost,
          ...post,
        },
      } as Patch;
    });
  });

  const testCases: TestCase[] = [
    [
      'a patch size matching image size',
      [2,2],
      2,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
          size: [2, 2,],
        },
        post: {
          origin: [0, 0,],
          size: [2, 2,],
        },
      }]]),
    ],

    [
      'a patch size larger than image size',
      [2,2],
      4,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
          size: [2, 2,],
        },
        post: {
          origin: [0, 0,],
          size: [2, 2,],
        },
      }]]),
    ],

    [
      'a patch size taller than image size in one dimension',
      [6,2],
      4,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
          size: [2, 4,],
        },
        post: {
          origin: [0, 0,],
          size: [2, 4,],
        },
      }, {
        pre: {
          origin: [0, 2,],
          size: [2, 4,],
        },
        post: {
          origin: [0, 2,],
          size: [2, 2,],
        },
      }]]),
    ],

    [
      'a smaller patch size that fits evenly into a taller image',
      [2,4],
      2,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
          size: [2, 2,],
        },
      }], [{
        pre: {
          origin: [2, 0,],
          size: [2, 2,],
        },
      }]], {
        post: {
          origin: [0, 0,],
          size: [2, 2,],
        }
      }),
    ],

    [
      'a smaller patch size that fits evenly into a wider image',
      [4,2],
      2,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
          size: [2, 2,],
        },
      }, {
        pre: {
          origin: [0, 2,],
          size: [2, 2,],
        },
      }]], {
        post: {
          origin: [0, 0,],
          size: [2, 2,],
        }
      }),
    ],

    [
      'an odd patch size that does not fit into image',
      [4,4],
      3,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
        },
        post: {
          origin: [0, 0,],
          size: [3, 3,],
        },
      }, {
        pre: {
          origin: [0, 1,],
        },
        post: {
          origin: [0, 2,],
          size: [3, 1,],
        },
      }], 
      [{
        pre: {
          origin: [1, 0,],
        },
        post: {
          origin: [2, 0,],
          size: [1, 3,],
        },
      }, {
        pre: {
          origin: [1, 1],
        },
        post: {
          origin: [2, 2,],
          size: [1, 1,],
        },
      }]], {
        pre: {
          size: [3,3],
        },
      }),
    ],

    [
      'an odd patch size that does not fit into a taller image',
      [4,5],
      3,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
        },
        post: {
          origin: [0, 0,],
          size: [3, 3,],
        },
      }, {
        pre: {
          origin: [0, 1,],
        },
        post: {
          origin: [0, 2,],
          size: [3, 1,],
        },
      }],
      [{
        pre: {
          origin: [2, 0,],
        },
        post: {
          origin: [1, 0,],
          size: [2, 3,],
        },
      }, {
        pre: {
          origin: [2, 1],
        },
        post: {
          origin: [1, 2,],
          size: [2, 1,],
        },
      }]], {
        pre: {
          size: [3,3],
        },
      }),
    ],
    [
      'an odd patch size that does not fit into a wider image',
      [5, 4],
      3,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
        },
        post: {
          origin: [0, 0,],
          size: [3, 3,],
        },
      }, {
        pre: {
          origin: [0, 2,],
        },
        post: {
          origin: [0, 1,],
          size: [3, 2,],
        },
      }],
      [{
        pre: {
          origin: [1, 0,],
        },
        post: {
          origin: [2, 0,],
          size: [1, 3,],
        },
      }, {
        pre: {
          origin: [1, 2],
        },
        post: {
          origin: [2, 1,],
          size: [1, 2,],
        },
      }]], {
        pre: {
          size: [3, 3],
        },
      }),
    ],

    [
      'an even patch size that does not fit into image',
      [5,5],
      4,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
        },
        post: {
          origin: [0, 0,],
          size: [4, 4,],
        },
      }, {
        pre: {
          origin: [0, 1,],
        },
        post: {
          origin: [0, 3,],
          size: [4, 1,],
        },
      }],
      [{
        pre: {
          origin: [1, 0,],
        },
        post: {
          origin: [3, 0,],
          size: [1, 4,],
        },
      }, {
        pre: {
          origin: [1, 1],
        },
        post: {
          origin: [3, 3,],
          size: [1, 1,],
        },
      }]], {
        pre: {
          size: [4,4],
        },
      }),
    ],

    [
      'an even patch size that does not fit into a taller image',
      [5,6],
      4,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
        },
        post: {
          origin: [0, 0,],
          size: [4, 4,],
        },
      }, {
        pre: {
          origin: [0, 1,],
        },
        post: {
          origin: [0, 3,],
          size: [4, 1,],
        },
      }],
      [{
        pre: {
          origin: [2, 0,],
        },
        post: {
          origin: [2, 0,],
          size: [2, 4,],
        },
      }, {
        pre: {
          origin: [2, 1],
        },
        post: {
          origin: [2, 3,],
          size: [2, 1,],
        },
      }]], {
        pre: {
          size: [4,4],
        },
      }),
    ],

    [
      'an even patch size that does not fit into a wider image',
      [6,5],
      4,
      0,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
        },
        post: {
          origin: [0, 0,],
          size: [4, 4,],
        },
      }, {
        pre: {
          origin: [0, 2],
        },
        post: {
          origin: [0, 2,],
          size: [4, 2,],
        },
      }], 
      [{
        pre: {
          origin: [1, 0,],
        },
        post: {
          origin: [3, 0,],
          size: [1, 4,],
        },
      }, {
        pre: {
          origin: [1, 2],
        },
        post: {
          origin: [3, 2,],
          size: [1, 2,],
        },
      }]], {
        pre: {
          size: [4,4],
        },
      }),
    ],

    [
      'an odd patch size with odd padding',
      [5, 5],
      3,
      1,
      buildTestCaseExpectation([[
        // 0
        {
          pre: { origin: [0, 0,], },
          post: {
            origin: [0, 0,],
            size: [2, 2,],
          },
        },
        // 1
        {
          pre: { origin: [0, 1,], },
          post: {
            origin: [0, 1,],
            size: [2, 1,],
          },
        },
        // 2
        {
          pre: { origin: [0, 2,], },
          post: {
            origin: [0, 1,],
            size: [2, 2,],
          },
        }],
        // 3
        [{
          pre: { origin: [1, 0,], },
          post: {
            origin: [1, 0,],
            size: [1, 2,],
          },
        },
        // 4
        {
          pre: { origin: [1, 1,], },
          post: {
            origin: [1, 1,],
            size: [1, 1,],
          },
        },
        // 5
        {
          pre: { origin: [1, 2,], },
          post: {
            origin: [1, 1,],
            size: [1, 2,],
          },
        }],
        // 6
        [{
          pre: { origin: [2, 0,], },
          post: {
            origin: [1, 0,],
            size: [2, 2,],
          },
        },
        // 7
        {
          pre: { origin: [2, 1,], },
          post: {
            origin: [1, 1,],
            size: [2, 1,],
          },
        },
        // 8
        {
          pre: { origin: [2, 2,], },
          post: {
            origin: [1, 1,],
            size: [2, 2,],
          },
        }]], {
        pre: {
          size: [3, 3],
        }
      }),
    ],

    [
      'an odd patch size with even padding',
      [6, 6],
      5,
      2,
      buildTestCaseExpectation([[
        // 0, we have 3x3 pixels covered
        {
          pre: { origin: [0, 0,], },
          post: {
            origin: [0, 0,],
            size: [3, 3],
          },
        },
        // 1, now we have covered the 4th pixel
        {
          pre: { origin: [0, 1,], },
          post: {
            origin: [0, 2,],
            size: [3, 3,],
          },
        }],
        // 2
        [{
          pre: { origin: [1, 0,], },
          post: {
            origin: [2, 0,],
            size: [3, 3,],
          },
        },
        // 3
        {
          pre: { origin: [1, 1,], },
          post: {
            origin: [2, 2,],
            size: [3, 3,],
          },
        }]], {
        pre: {
          size: [5, 5],
        }
      }),
    ],

    [
      'an even patch size with odd padding',
      [6, 6],
      4,
      1,
      buildTestCaseExpectation([[
        // 0
        {
          pre: { origin: [0, 0,], },
          post: {
            origin: [0, 0,],
            size: [3, 3],
          },
        },
        // 1
        {
          pre: { origin: [0, 2,], },
          post: {
            origin: [0, 1,],
            size: [3, 3,],
          },
        }],
        // 2
        [{
          pre: { origin: [2, 0], },
          post: {
            origin: [1, 0],
            size: [3, 3],
          },
        },
        // 3
        {
          pre: { origin: [2, 2], },
          post: {
            origin: [1, 1],
            size: [3, 3],
          },
        }]], {
        pre: {
          size: [4, 4],
        }
      }),
    ],

    [
      'an even patch size with even padding',
      [8, 8],
      6,
      2,
      buildTestCaseExpectation([[
        // 0
        {
          pre: { origin: [0, 0,], },
          post: {
            origin: [0, 0,],
            size: [4, 4],
          },
        },
        // 1
        {
          pre: { origin: [0, 2,], },
          post: {
            origin: [0, 2,],
            size: [4, 4,],
          },
        }],
        // 2
        [{
          pre: { origin: [2, 0], },
          post: {
            origin: [2, 0],
            size: [4, 4],
          },
        },
        // 3
        {
          pre: { origin: [2, 2], },
          post: {
            origin: [2, 2],
            size: [4, 4],
          },
        }]], {
        pre: {
          size: [6, 6],
        }
      }),
    ],

    [
      'a sanity check',
      [9, 9],
      5,
      1,
      buildTestCaseExpectation([[
        // 0
        {
          pre: { origin: [0, 0,], },
          post: {
            origin: [0, 0,],
            size: [4, 4],
          },
        },
        // 1
        {
          pre: { origin: [0, 3,], },
          post: {
            origin: [0, 1,],
            size: [4, 3,],
          },
        },
        // 2
        {
          pre: { origin: [0, 4], },
          post: {
            origin: [0, 3],
            size: [4, 2],
          },
        }], 
        // 3
        [{
          pre: { origin: [3, 0,], },
          post: {
            origin: [1, 0,],
            size: [3, 4],
          },
        },
        // 4
        {
          pre: { origin: [3, 3,], },
          post: {
            origin: [1, 1,],
            size: [3, 3,],
          },
        },
        // 5
        {
          pre: { origin: [3, 4], },
          post: {
            origin: [1, 3],
            size: [3, 2],
          },
        }],
        // 6
        [{
          pre: { origin: [4, 0,], },
          post: {
            origin: [3, 0,],
            size: [2, 4],
          },
        },
        // 7
        {
          pre: { origin: [4, 3,], },
          post: {
            origin: [3, 1,],
            size: [2, 3,],
          },
        },
        // 8
        {
          pre: { origin: [4, 4], },
          post: {
            origin: [3, 3],
            size: [2, 2],
          },
        }
      ]], {
        pre: {
          size: [5, 5],
        }
      }),
    ],

    [
      'a larger sanity check',
      [200, 300],
      128,
      2,
      buildTestCaseExpectation([[
        // 0
        {
          pre: { origin: [0, 0,], },
          post: {
            origin: [0, 0,],
            size: [126, 126],
          },
        },
        // 1
        {
          pre: { origin: [0, 72,], },
          post: {
            origin: [0, 54,],
            size: [126, 74],
          },
        }],
        // 2
        [{
          pre: { origin: [124, 0], },
          post: {
            origin: [2, 0],
            size: [124, 126],
          },
        }, 
        // 3
        {
          pre: { origin: [124, 72], },
          post: {
            origin: [2, 54],
            size: [124, 74],
          },
        }],
        // 4
        [{
          pre: { origin: [172, 0,], },
          post: {
            origin: [78, 0,],
            size: [50, 126,],
          },
        },
        // 5
        {
          pre: { origin: [172, 72,], },
          post: {
            origin: [78, 54,],
            size: [50, 74,],
          },
        },
      ]], {
        pre: {
          size: [128, 128],
        }
      }),
    ],

    [
      'a tall ragged image',
      [3, 7],
      6,
      1,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
        },
        post: {
          origin: [0, 0,],
          size: [5, 3,],
        },
      }],
      [{
        pre: {
          origin: [1, 0],
        },
        post: {
          origin: [4, 0,],
          size: [2, 3,],
        },
      }]], {
        pre: {
          size: [6, 3],
        },
      }),
    ],

    [
      'a tall ragged image',
      [5, 7],
      6,
      1,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
        },
        post: {
          origin: [0, 0,],
          size: [5, 5,],
        },
      }],
      [{
        pre: {
          origin: [1, 0],
        },
        post: {
          origin: [4, 0,],
          size: [2, 5,],
        },
      }]], {
        pre: {
          size: [6, 5],
        },
      }),
    ],

    [
      'a tall ragged image where the patch size fills one dimension',
      [6, 7],
      6,
      1,
      buildTestCaseExpectation([[{
        pre: {
          origin: [0, 0,],
        },
        post: {
          origin: [0, 0,],
          size: [5, 6,],
        },
      }],
      [{
        pre: {
          origin: [1, 0],
        },
        post: {
          origin: [4, 0,],
          size: [2, 6,],
        },
      }]], {
        pre: {
          size: [6, 6],
        },
      }),
    ],
  ];
  test.each(testCases)(
    [
      '%s',
      'image size: %p',
      'patch size: %i',
      'padding: %i',
    ].join(' | '),
    (_, imageSize, patchSize, padding, _expectation) => {
      const result = getPatchesFromImage(imageSize, patchSize, padding);
      expect(result).toEqual(_expectation);
    });
});
