import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decodeImageLayout,
  encodeImageLayout,
  injectTableColumnWidths,
  stripTableColumnWidths
} from '../src/renderer/editor/markdown-presentation'

test('图片布局元数据支持像素宽度与三种对齐方式', () => {
  assert.deepEqual(decodeImageLayout('beiye:image;width=320px;align=right'), { width: '320px', align: 'right' })
  assert.deepEqual(decodeImageLayout(null), { width: null, align: 'center' })
  assert.deepEqual(decodeImageLayout('ordinary title'), { width: null, align: 'center' })
  assert.equal(encodeImageLayout({ width: '320px', align: 'right' }), 'beiye:image;width=320px;align=right')
  assert.equal(encodeImageLayout({ width: null, align: 'center' }), null)
})

test('无效图片宽度和对齐不会进入文档元数据', () => {
  assert.deepEqual(decodeImageLayout('beiye:image;width=100vw;align=sideways'), { width: null, align: 'center' })
})

test('旧版本图片布局仍可读取，但新写入统一使用北页当前格式', () => {
  assert.deepEqual(decodeImageLayout('beiye-image:width=44px;align=left'), { width: '44px', align: 'left' })
  assert.deepEqual(decodeImageLayout('beiye-width:75'), { width: '75%', align: 'center' })
  assert.equal(encodeImageLayout(decodeImageLayout('beiye-image:width=44px;align=left')), 'beiye:image;width=44px;align=left')
})

test('表格列宽元数据插入表格之前并可无损剥离', () => {
  const markdown = ['# 表格', '', '| 名称 | 数量 |', '| --- | ---: |', '| 北页 | 2 |'].join('\n')
  const withWidths = injectTableColumnWidths(markdown, [[240, 120]])

  assert.equal(withWidths, ['# 表格', '', '<!-- beiye:columns=240,120 -->', '| 名称 | 数量 |', '| --- | ---: |', '| 北页 | 2 |'].join('\n'))
  assert.deepEqual(stripTableColumnWidths(withWidths), { markdown, widths: [[240, 120]] })
})

test('代码围栏中的伪表格和元数据注释保持原样', () => {
  const markdown = ['```md', '<!-- beiye:columns=80,90 -->', '| a | b |', '| - | - |', '```'].join('\n')
  assert.deepEqual(stripTableColumnWidths(markdown), { markdown, widths: [] })
})

test('旧版本表格列宽可读取，并在再次写入时迁移为当前格式', () => {
  const legacy = ['<!-- beiyemd:table-widths=90,180 -->', '| a | b |', '| --- | --- |'].join('\n')
  const stripped = stripTableColumnWidths(legacy)

  assert.deepEqual(stripped, { markdown: ['| a | b |', '| --- | --- |'].join('\n'), widths: [[90, 180]] })
  assert.match(injectTableColumnWidths(stripped.markdown, stripped.widths), /^<!-- beiye:columns=90,180 -->/u)
})
