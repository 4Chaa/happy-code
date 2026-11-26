import { expect, test } from 'claude-code/testing'

const ENGINE = [{ id: 'intro', text: 'engine', scope: 'shared' }] as const
// The whole input the engine passes: next() refuses one without promptModel.
const COMPOSE = { model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: [], tools: [], outputStyle: null, traits: [] } as const

test('style section is appended last, on the session side, short', async ($, on) => {
  on('prompt.compose', () => ({ sections: ENGINE }))

  const { sections } = await $.prompt.compose(COMPOSE)
  const last = sections[sections.length - 1]

  expect(sections.length).toBe(2)
  expect(last?.id).toBe('happy-code:style')
  expect(last?.scope).toBe('session')
  expect((last?.text ?? '').split('\n').length <= 40).toBe(true)
  for (const mark of ['ไทย', 'ต่อไปทำอะไร', '1A', '★', '⛔', 'diff', 'ใช้ค่าแนะนำ', 'พิมพ์']) {
    expect((last?.text ?? '').includes(mark)).toBe(true)
  }
})

test('a bare prompt gets no style section', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'bare', text: 'engine', scope: 'shared' }] }))

  const { sections } = await $.prompt.compose({ ...COMPOSE, traits: ['bare'] })

  expect(sections.map(section => section.id)).toEqual(['bare'])
})

test('thaiStyle off leaves the prompt alone', { options: { thaiStyle: false } }, async ($, on) => {
  on('prompt.compose', () => ({ sections: ENGINE }))

  const { sections } = await $.prompt.compose(COMPOSE)

  expect(sections.map(section => section.id)).toEqual(['intro'])
})
