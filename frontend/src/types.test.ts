import { describe, it, expect } from 'vitest'
import {
  getTopicKey,
  parseTopicKey,
  flattenTopics,
  findTopicByKey,
  type Curriculum,
  type Topic,
  type Cluster,
  type FlatTopic
} from './types'

describe('getTopicKey', () => {
  it('should create a valid topic key from indices', () => {
    expect(getTopicKey(0, 0)).toBe('0-0')
    expect(getTopicKey(1, 2)).toBe('1-2')
    expect(getTopicKey(10, 5)).toBe('10-5')
  })

  it('should handle edge cases', () => {
    expect(getTopicKey(0, 0)).toBe('0-0')
    expect(getTopicKey(99, 99)).toBe('99-99')
  })
})

describe('parseTopicKey', () => {
  it('should parse a topic key into indices', () => {
    expect(parseTopicKey('0-0')).toEqual({ clusterIndex: 0, topicIndex: 0 })
    expect(parseTopicKey('1-2')).toEqual({ clusterIndex: 1, topicIndex: 2 })
    expect(parseTopicKey('10-5')).toEqual({ clusterIndex: 10, topicIndex: 5 })
  })

  it('should be inverse of getTopicKey', () => {
    const key = getTopicKey(3, 7)
    const parsed = parseTopicKey(key)
    expect(parsed).toEqual({ clusterIndex: 3, topicIndex: 7 })
  })
})

describe('flattenTopics', () => {
  const createTopic = (name: string, order: number): Topic => ({
    name,
    description: `Description for ${name}`,
    order,
    prerequisites: []
  })

  const createCluster = (name: string, order: number, topics: Topic[]): Cluster => ({
    name,
    description: `Description for ${name}`,
    order,
    topics
  })

  it('should flatten a simple curriculum', () => {
    const curriculum: Curriculum = {
      subject: 'Test Subject',
      description: 'Test Description',
      clusters: [
        createCluster('Cluster 1', 1, [
          createTopic('Topic 1', 1),
          createTopic('Topic 2', 2)
        ])
      ]
    }

    const flattened = flattenTopics(curriculum)

    expect(flattened).toHaveLength(2)
    expect(flattened[0].topic.name).toBe('Topic 1')
    expect(flattened[1].topic.name).toBe('Topic 2')
  })

  it('should preserve cluster and topic indices', () => {
    const curriculum: Curriculum = {
      subject: 'Test',
      description: 'Test',
      clusters: [
        createCluster('Cluster A', 1, [
          createTopic('Topic A1', 1),
          createTopic('Topic A2', 2)
        ]),
        createCluster('Cluster B', 2, [
          createTopic('Topic B1', 1)
        ])
      ]
    }

    const flattened = flattenTopics(curriculum)

    expect(flattened).toHaveLength(3)
    // First cluster topics
    expect(flattened[0].clusterIndex).toBe(0)
    expect(flattened[0].topicIndex).toBe(0)
    expect(flattened[1].clusterIndex).toBe(0)
    expect(flattened[1].topicIndex).toBe(1)
    // Second cluster topic
    expect(flattened[2].clusterIndex).toBe(1)
    expect(flattened[2].topicIndex).toBe(0)
  })

  it('should sort clusters by order', () => {
    const curriculum: Curriculum = {
      subject: 'Test',
      description: 'Test',
      clusters: [
        createCluster('Second Cluster', 2, [createTopic('Topic B', 1)]),
        createCluster('First Cluster', 1, [createTopic('Topic A', 1)])
      ]
    }

    const flattened = flattenTopics(curriculum)

    expect(flattened[0].clusterName).toBe('First Cluster')
    expect(flattened[1].clusterName).toBe('Second Cluster')
  })

  it('should sort topics within clusters by order', () => {
    const curriculum: Curriculum = {
      subject: 'Test',
      description: 'Test',
      clusters: [
        createCluster('Cluster', 1, [
          createTopic('Third', 3),
          createTopic('First', 1),
          createTopic('Second', 2)
        ])
      ]
    }

    const flattened = flattenTopics(curriculum)

    expect(flattened[0].topic.name).toBe('First')
    expect(flattened[1].topic.name).toBe('Second')
    expect(flattened[2].topic.name).toBe('Third')
  })

  it('should assign global indices', () => {
    const curriculum: Curriculum = {
      subject: 'Test',
      description: 'Test',
      clusters: [
        createCluster('Cluster 1', 1, [
          createTopic('Topic 1', 1),
          createTopic('Topic 2', 2)
        ]),
        createCluster('Cluster 2', 2, [
          createTopic('Topic 3', 1),
          createTopic('Topic 4', 2)
        ])
      ]
    }

    const flattened = flattenTopics(curriculum)

    expect(flattened[0].globalIndex).toBe(0)
    expect(flattened[1].globalIndex).toBe(1)
    expect(flattened[2].globalIndex).toBe(2)
    expect(flattened[3].globalIndex).toBe(3)
  })

  it('should generate correct topic keys', () => {
    const curriculum: Curriculum = {
      subject: 'Test',
      description: 'Test',
      clusters: [
        createCluster('Cluster', 1, [
          createTopic('Topic 1', 1),
          createTopic('Topic 2', 2)
        ])
      ]
    }

    const flattened = flattenTopics(curriculum)

    expect(flattened[0].topicKey).toBe('0-0')
    expect(flattened[1].topicKey).toBe('0-1')
  })

  it('should handle empty curriculum', () => {
    const curriculum: Curriculum = {
      subject: 'Empty',
      description: 'Empty curriculum',
      clusters: []
    }

    const flattened = flattenTopics(curriculum)

    expect(flattened).toHaveLength(0)
  })

  it('should handle clusters with no topics', () => {
    const curriculum: Curriculum = {
      subject: 'Test',
      description: 'Test',
      clusters: [
        createCluster('Empty Cluster', 1, [])
      ]
    }

    const flattened = flattenTopics(curriculum)

    expect(flattened).toHaveLength(0)
  })
})

describe('findTopicByKey', () => {
  const createFlatTopic = (
    name: string,
    clusterIndex: number,
    topicIndex: number,
    globalIndex: number
  ): FlatTopic => ({
    topic: {
      name,
      description: `Description for ${name}`,
      order: topicIndex + 1,
      prerequisites: []
    },
    clusterIndex,
    topicIndex,
    clusterName: `Cluster ${clusterIndex}`,
    globalIndex,
    topicKey: getTopicKey(clusterIndex, topicIndex)
  })

  it('should find a topic by its key', () => {
    const flatTopics: FlatTopic[] = [
      createFlatTopic('Topic 1', 0, 0, 0),
      createFlatTopic('Topic 2', 0, 1, 1),
      createFlatTopic('Topic 3', 1, 0, 2)
    ]

    const found = findTopicByKey(flatTopics, '0-1')

    expect(found).toBeDefined()
    expect(found?.topic.name).toBe('Topic 2')
  })

  it('should return undefined for non-existent key', () => {
    const flatTopics: FlatTopic[] = [
      createFlatTopic('Topic 1', 0, 0, 0)
    ]

    const found = findTopicByKey(flatTopics, '5-5')

    expect(found).toBeUndefined()
  })

  it('should return undefined for empty array', () => {
    const found = findTopicByKey([], '0-0')

    expect(found).toBeUndefined()
  })
})
