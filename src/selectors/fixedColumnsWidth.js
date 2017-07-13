/**
 * Copyright Schrodinger, LLC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule fixedColumnsWidth
 */
import columnsSelector from 'columns';
import { createSelector } from 'reselect';

/**
 * @param {{
 *   columnGroups: {!Array.<{
 *     columns: !Array.{
 *       flexGrow: number,
 *       width: number,
 *     },
 *   }>},
 *   width: number,
 * }} state
 * @return {number} The combined width of the fixed columns.
 */
export default createSelector([
  columnsSelector,
], columns => {
  const { fixedColumns } = columns;

  let totalFixedColumnsWidth = 0;
  for (let columnIdx = 0; columnIdx < fixedColumns.length; ++columnIdx) {
    totalFixedColumnsWidth += fixedColumns[columnIdx].width;
  }
  return totalFixedColumnsWidth;
});
