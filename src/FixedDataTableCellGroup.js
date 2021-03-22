/**
 * Copyright Schrodinger, LLC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FixedDataTableCellGroup
 * @typechecks
 */

'use strict';

import FixedDataTableCell from 'FixedDataTableCell';
import FixedDataTableTranslateDOMPosition from 'FixedDataTableTranslateDOMPosition';
import PropTypes from 'prop-types';
import React from 'react';
import cx from 'cx';
import { sumPropWidths } from 'widthHelper';
import _ from 'lodash';

class FixedDataTableCellGroupImpl extends React.Component {
  /**
   * PropTypes are disabled in this component, because having them on slows
   * down the FixedDataTable hugely in DEV mode. You can enable them back for
   * development, but please don't commit this component with enabled propTypes.
   */
  static propTypes_DISABLED_FOR_PERFORMANCE = {

    /**
     * Array of per column configuration properties.
     */
    columns: PropTypes.array.isRequired,

    isScrolling: PropTypes.bool,

    left: PropTypes.number,

    height: PropTypes.number.isRequired,

    /**
     * Height of fixedDataTableCellGroupLayout/cellGroupWrapper.
     */
    cellGroupWrapperHeight: PropTypes.number,

    rowHeight: PropTypes.number.isRequired,

    rowIndex: PropTypes.number.isRequired,

    width: PropTypes.number.isRequired,

    zIndex: PropTypes.number.isRequired,

    touchEnabled: PropTypes.bool,

    isHeaderOrFooter: PropTypes.bool,

    isRTL: PropTypes.bool,

    /**
     * The height of the table.
     */
    tableHeight: PropTypes.number,

    /**
     * Callback that is called when resizer has been released
     * and column needs to be updated.
     *
     * Only for backward compatibility.
     *
     * Required if the isResizable property is true on any column.
     *
     * ```
     * function(
     *   newColumnWidth: number,
     *   columnKey: string,
     * )
     * ```
     */
    onColumnResizeEndCallback: PropTypes.func,

    /**
     * Callback that is called when reordering has been completed
     * and columns need to be updated.
     *
     * ```
     * function(
     *   event {
     *     columnBefore: string|undefined, // the column before the new location of this one
     *     columnAfter: string|undefined,  // the column after the new location of this one
     *     reorderColumn: string,          // the column key that was just reordered
     *   }
     * )
     * ```
     */
    onColumnReorderEndCallback: PropTypes.func,

    /**
     * Whether these cells belong to the header/group-header
     */
    isHeader: PropTypes.bool,

    /**
     * availableScrollWidth returned from ColumnWidths.
     */
    availableScrollWidth: PropTypes.number,

    /**
     * Maximum horizontal scroll possible.
     */
    maxScrollX: PropTypes.number,

    /**
     * Function to change the scroll position by interacting
     * with the store.
     */
    scrollToX: PropTypes.func,

    /**
     * Whether the cells belongs to the fixed group
     */
    isFixed: PropTypes.bool,
  }

  state = {
    recycling: {}
  }

  constructor(props) {
    super(props);
    this._initialRender = true;
  }

  componentDidMount() {
    this._initialRender = false;
  }

  /**
   * Returns Object consisting of keys and widths of the columns in the current cell group.
   * @returns {{keys: [], widths: []}}
   */
  getCellGroupWidth = () => {
    const { columns } = this.props;
    const cellGroupColumnWidths = {
      keys: [],
      widths: []
    };
    if (this.props.isHeader) {
      for (let i = 0, j = columns.length; i < j; i++) {
        const key = columns[i].props.columnKey || 'cell_' + i;
        cellGroupColumnWidths.keys.push(key);
        cellGroupColumnWidths.widths.push(columns[i].props.width);
      }
    }
    return cellGroupColumnWidths;
  }


  render() /*object*/ {
    var props = this.props;
    var columns = props.columns;
    var cells = new Array(columns.length);
    var contentWidth = sumPropWidths(columns);

    var currentPosition = 0;
    for (var i = 0, j = columns.length; i < j; i++) {
      var columnProps = columns[i].props;
      var cellTemplate = columns[i].template;
     /* Todo(deshpsuy): recyclable should always be false while reordering. But since now reordering is decoupled out of FDT.
         We have to investigate here.*/
      var recyclable = _.get(this.state.recycling, [columnProps.columnKey], columnProps.allowCellsRecycling);
      if (!recyclable || (
        currentPosition - props.left <= props.width &&
        currentPosition - props.left + columnProps.width >= 0)) {
        var key = columnProps.columnKey || 'cell_' + i;
        cells[i] = this._renderCell(
          props.rowIndex,
          props.rowHeight,
          columnProps,
          cellTemplate,
          currentPosition,
          key,
          contentWidth,
        );
      }
      currentPosition += columnProps.width;
    }
    var style = {
      height: props.height,
      position: 'absolute',
      width: contentWidth,
      zIndex: props.zIndex,
    };
    FixedDataTableTranslateDOMPosition(style, -1 * props.left, 0, this._initialRender, this.props.isRTL);

    return (
      <div
        className={cx('fixedDataTableCellGroupLayout/cellGroup')}
        style={style}>
        {cells}
      </div>
    );
  }

  _renderCell = (
    /*number*/ rowIndex,
    /*number*/ height,
    /*object*/ columnProps,
    /*object*/ cellTemplate,
    /*number*/ left,
    /*string*/ key,
    /*number*/ columnGroupWidth
  ) /*object*/ => {

    var className = columnProps.cellClassName;
    var pureRendering = columnProps.pureRendering || false;

    const onColumnReorderEndCallback =
      (columnProps.isReorderable)
        ? this.props.onColumnReorderEndCallback
        : null;
    const onColumnResizeEndCallback =
    (columnProps.isResizable)
      ? this.props.onColumnResizeEndCallback
      : null;

    return (
      <FixedDataTableCell
        isScrolling={this.props.isScrolling}
        isHeaderOrFooter={this.props.isHeaderOrFooter}
        isHeader={this.props.isHeader}
        tableHeight={this.props.tableHeight}
        align={columnProps.align}
        className={className}
        height={height}
        key={key}
        maxWidth={columnProps.maxWidth}
        minWidth={columnProps.minWidth}
        touchEnabled={this.props.touchEnabled}
        onColumnResizeEndCallback={onColumnResizeEndCallback}
        onColumnReorderEndCallback={onColumnReorderEndCallback}
        rowIndex={rowIndex}
        columnKey={columnProps.columnKey}
        width={columnProps.width}
        left={left}
        cellGroupLeft={this.props.left}
        cell={cellTemplate}
        columnGroupWidth={columnGroupWidth}
        pureRendering={pureRendering}
        isRTL={this.props.isRTL}
        scrollX={this.props.scrollX}
        isFixed={this.props.isFixed}
        availableScrollWidth={this.props.availableScrollWidth}
        maxScrollX={this.props.maxScrollX}
        scrollToX={this.props.scrollToX}
        toggleCellsRecycling={this.toggleCellsRecycling}
        getCellGroupWidth={this.getCellGroupWidth}
      />
    );
  }

  /**
   * @deprecated Added to have backward compatibility. This will be removed in future release.
   * @param {boolean} value
   * @param {string} columnKey
   */
  toggleCellsRecycling = (value, columnKey) => {
    // Only set in state, when value is false, means reordering has started
    if(!value) {
      this.setState({ recycling: { [columnKey]: value } })
    } else {
      this.setState({
        recycling: {}
      })
    }
  }
}

class FixedDataTableCellGroup extends React.Component {
  /**
   * PropTypes are disabled in this component, because having them on slows
   * down the FixedDataTable hugely in DEV mode. You can enable them back for
   * development, but please don't commit this component with enabled propTypes.
   */
  static propTypes_DISABLED_FOR_PERFORMANCE = {
    isScrolling: PropTypes.bool,
    /**
     * Height of the row.
     */
    height: PropTypes.number.isRequired,

    offsetLeft: PropTypes.number,

    left: PropTypes.number,
    /**
     * Z-index on which the row will be displayed. Used e.g. for keeping
     * header and footer in front of other rows.
     */
    zIndex: PropTypes.number.isRequired,
  }

  shouldComponentUpdate(/*object*/ nextProps) /*boolean*/ {
    return (
      !nextProps.isScrolling ||
      this.props.rowIndex !== nextProps.rowIndex ||
      this.props.left !== nextProps.left
    );
  }

  static defaultProps = /*object*/ {
    left: 0,
    offsetLeft: 0,
  }

  render() /*object*/ {
    var { offsetLeft, ...props } = this.props;

    var style = {
      height: props.cellGroupWrapperHeight || props.height,
      width: props.width
    };

    if (this.props.isRTL) {
      style.right = offsetLeft;
    } else {
      style.left = offsetLeft;
    }

    return (
      <div style={style} className={cx('fixedDataTableCellGroupLayout/cellGroupWrapper')}>
        <FixedDataTableCellGroupImpl
          {...props}
        />
      </div>
    );
  }
}
export default FixedDataTableCellGroup;
