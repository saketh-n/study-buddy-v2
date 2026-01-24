/**
 * Test data fixtures for E2E tests
 */

export const testCurriculum = {
  subject: 'Data Structures and Algorithms',
  description: 'A comprehensive guide to DSA fundamentals',
  clusters: [
    {
      name: 'Search Algorithms',
      description: 'Fundamental searching techniques',
      order: 1,
      topics: [
        {
          name: 'Binary Search',
          description: 'Efficient searching in sorted arrays',
          order: 1,
          prerequisites: []
        },
        {
          name: 'Linear Search',
          description: 'Simple sequential search',
          order: 2,
          prerequisites: []
        }
      ]
    },
    {
      name: 'Sorting Algorithms',
      description: 'Methods for ordering data',
      order: 2,
      topics: [
        {
          name: 'Bubble Sort',
          description: 'Simple comparison-based sorting',
          order: 1,
          prerequisites: []
        }
      ]
    }
  ]
}

export const testCurriculumText = `
Learn Data Structures and Algorithms:

1. Search Algorithms
   - Binary Search: Efficient searching in sorted arrays
   - Linear Search: Simple sequential search

2. Sorting Algorithms
   - Bubble Sort: Simple comparison-based sorting
`
