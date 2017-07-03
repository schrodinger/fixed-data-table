/**
 * Copyright Schrodinger, LLC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FixedDataTableWidthHelper
 * @typechecks
 */

'use strict';

import React from 'React';

/**
 * Flatten nested columns 
 */
function getNestedColumns(/*array*/ columns, /*array*/ initial)/*array*/ {
  return columns.reduce((prev, column) => {
    if (!column.type.__TableColumn__) {
      return getNestedColumns(
        React.Children.toArray(column.props.children),
        prev
      );
    }

    return prev.concat(column);
  }, initial || []);
}

/** 
 * Summ all column widths
 */
function getTotalWidth(/*array*/ columns) /*number*/ {
  return columns.reduce((totalWidth, column) => {
    return totalWidth + column.props.width;
  }, 0);
}

/** 
 * Summ all column flexGrows
 */
function getTotalFlexGrow(/*array*/ columns) /*number*/ {
  return columns.reduce((totalFlexGrow, column) => {
    if (column.props.flexGrow > 0) {
      return totalFlexGrow + column.props.flexGrow;
    }

    return totalFlexGrow;
  }, 0);
}

/**
 * Divide total available flexWidth by total number of flexGrow
 */
function getSingleColumnFlexWidth(
  /*array*/ columns,
  /*number*/ totalFlexWidth
) /*number*/ {
  const totalFlexGrow = getTotalFlexGrow(columns);

  return (totalFlexGrow !== 0) ? (totalFlexWidth / totalFlexGrow) : 0;
}

/** 
 * Calculate new width including flexWidth
 */
function addFlexWidth(
  /*number*/ width,
  /*number*/ columnFlexGrow = 0,
  /*number*/ singleColumnFlexWidth
) /*number*/ {
  const columnFlexWidth = columnFlexGrow * singleColumnFlexWidth;
  return width + columnFlexWidth;
}

function distributeFlexWidth(
  /*array*/ columns,
  /*number*/ totalFlexWidth
) /*object*/ {
  if (totalFlexWidth <= 0) {
    return {
      columns: columns,
      width: getTotalWidth(columns),
    };
  }

  let totalWidth = 0;
  const newColumns = columns.map((column) => {
    if (!column.props.flexGrow) {
      totalWidth += column.props.width;
      return column;
    }
    const columnFlexWidth = Math.floor(
      column.props.flexGrow / remainingFlexGrow * remainingFlexWidth
    );

    const newColumnWidth = addFlexWidth(
      column.props.width,
      column.props.flexGrow,
      getSingleColumnFlexWidth(columns, totalFlexWidth)
    );
    totalWidth += newColumnWidth;

    remainingFlexGrow -= column.props.flexGrow;
    remainingFlexWidth -= columnFlexWidth;

    return React.cloneElement(
      column,
      { width: newColumnWidth }
    );
  });

  return {
    columns: newColumns,
    width: totalWidth,
  };
}

/**
 * Build rekursive tree and calculate group values from descendants
 */
function iterateNestedColumns(
  /*array*/ columns,
  /*number*/ singleColumnFlexWidth,
  /*function*/ callback = () => { }
) /*array*/ {
  return columns.map((column) => {
    let newProps;

    if (!column.type.__TableColumn__) {
      let width = 0;

      function getWidth(passedWidth, passedFlexGrow) {
        width += passedWidth;
      }

      const children = React.Children.toArray(column.props.children);
      const innerColumns = iterateNestedColumns(
        children,
        singleColumnFlexWidth,
        getWidth
      );

      newProps = {
        width,
        children: innerColumns,
      };
    } else {
      newProps = {
        width: addFlexWidth(
          column.props.width,
          column.props.flexGrow,
          singleColumnFlexWidth
        ),
      };
    }

    callback(newProps.width);

    return React.cloneElement(
      column,
      newProps
    );
  });
}

function adjustColumnGroupWidths(
  /*array*/ columnGroups,
  /*number*/ expectedWidth
) /*object*/ {
  const allColumns = getNestedColumns(columnGroups);
  const totalCollumnsWidth = getTotalWidth(allColumns);
  const totalFlexWidth = Math.max(expectedWidth - totalCollumnsWidth, 0);

  const singleColumnFlexWidth = getSingleColumnFlexWidth(
    allColumns,
    totalFlexWidth
  );

  const newColumnGroups = iterateNestedColumns(
    columnGroups,
    singleColumnFlexWidth
  );
  const newColumns = getNestedColumns(newColumnGroups);

  return {
    columnGroups: newColumnGroups,
    columns: newColumns,
  };
}

function adjustColumnWidths(
  /*array*/ columns,
  /*number*/ expectedWidth
) /*array*/ {
  const columnsWidth = getTotalWidth(columns);

  if (columnsWidth < expectedWidth) {
    return distributeFlexWidth(columns, expectedWidth - columnsWidth).columns;
  }

  return columns;
}

const FixedDataTableWidthHelper = {
  getTotalWidth,
  getTotalFlexGrow,
  distributeFlexWidth,
  adjustColumnWidths,
  adjustColumnGroupWidths,
};

module.exports = FixedDataTableWidthHelper;
