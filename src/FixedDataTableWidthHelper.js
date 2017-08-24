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
    // TODO (dangoo) improve this check to only return true for column-like elements (Issue #175)
    if (column.type.__TableColumn__) {
      return prev.concat(column);
    }

    return getNestedColumns(
      React.Children.toArray(column.props.children),
      prev
    );
    
  }, initial || []);
}

/** 
 * Sum all column widths
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
function getUnitFlexWidth(
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
  /*number*/ unitFlexWidth
) /*number*/ {
  const columnFlexWidth = columnFlexGrow * unitFlexWidth;
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
  const unitFlexWidth = getUnitFlexWidth(columns, totalFlexWidth);
  const newColumns = columns.map((column) => {
    if (!column.props.flexGrow) {
      totalWidth += column.props.width;
      return column;
    }

    const newColumnWidth = addFlexWidth(
      column.props.width,
      column.props.flexGrow,
      unitFlexWidth
    );
    totalWidth += newColumnWidth;

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
 * Build recursive tree and calculate group values from descendants
 */
function iterateNestedColumns(
  /*array*/ columns,
  /*number*/ unitFlexWidth,
  /*function*/ counter = () => { }
) /*array*/ {
  return columns.map((column) => {
    let newProps;

    // TODO (dangoo) improve this check to only return true for column-like elements (Issue #175)
    if (column.type.__TableColumn__) {
      // Compute new dimensions for column
      newProps = {
        width: addFlexWidth(
          column.props.width,
          column.props.flexGrow,
          unitFlexWidth
        ),
      };
    } else {
      // Counter item(s)
      let width = 0;

      /*
       * Callback to calculate data based on all children.
       * Each level of the recursion calls the counter callback to increase the parent counter values
       * such as the width of all children. This way we can avoid one additional step to walk over all
       * children after the recursive mapping and sum up their values. Instead we can just use the counter
       * variable charged by the counter callback during recursion.
       */

      function addToCounter(passedWidth) {
        width += passedWidth;
      }

      const children = React.Children.toArray(column.props.children);
      const innerColumns = iterateNestedColumns(
        children,
        unitFlexWidth,
        addToCounter
      );

      newProps = {
        width,
        children: innerColumns,
      };
    }

    // Charge counter with elements props
    counter(newProps.width);

    // Returns new element with recalculated dimensions
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

  const unitFlexWidth = getUnitFlexWidth(
    allColumns,
    totalFlexWidth
  );

  const newColumnGroups = iterateNestedColumns(
    columnGroups,
    unitFlexWidth
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
