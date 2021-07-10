/**
 * Copyright Schrodinger, LLC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FixedDataTable
 * @typechecks
 * @noflow
 */

/*eslint no-bitwise:1*/

import React from 'react';
import PropTypes from 'prop-types';
import isNaN from 'lodash/isNaN';

import cx from './vendor_upstream/stubs/cx';
import debounceCore from './vendor_upstream/core/debounceCore';
import joinClasses from './vendor_upstream/core/joinClasses';
import shallowEqual from './vendor_upstream/core/shallowEqual';
import ReactWheelHandler from './vendor_upstream/dom/ReactWheelHandler';

import ariaAttributesSelector from './selectors/ariaAttributes';
import columnTemplatesSelector from './selectors/columnTemplates';
import scrollbarsVisible from './selectors/scrollbarsVisible';
import tableHeightsSelector from './selectors/tableHeights';
import ColumnResizerLine from './ColumnResizerLine';
import FixedDataTableBufferedRows from './FixedDataTableBufferedRows';
import FixedDataTableEventHelper from './FixedDataTableEventHelper';
import FixedDataTableRow from './FixedDataTableRow';
import ReactTouchHandler from './ReactTouchHandler';

var ARROW_SCROLL_SPEED = 25;

/**
 * Data grid component with fixed or scrollable header and columns.
 *
 * The layout of the data table is as follows:
 *
 * ```
 * +---------------------------------------------------+
 * | Fixed Column Group    | Scrollable Column Group   |
 * | Header                | Header                    |
 * |                       |                           |
 * +---------------------------------------------------+
 * |                       |                           |
 * | Fixed Header Columns  | Scrollable Header Columns |
 * |                       |                           |
 * +-----------------------+---------------------------+
 * |                       |                           |
 * | Fixed Body Columns    | Scrollable Body Columns   |
 * |                       |                           |
 * +-----------------------+---------------------------+
 * |                       |                           |
 * | Fixed Footer Columns  | Scrollable Footer Columns |
 * |                       |                           |
 * +-----------------------+---------------------------+
 * ```
 *
 * - Fixed Column Group Header: These are the headers for a group
 *   of columns if included in the table that do not scroll
 *   vertically or horizontally.
 *
 * - Scrollable Column Group Header: The header for a group of columns
 *   that do not move while scrolling vertically, but move horizontally
 *   with the horizontal scrolling.
 *
 * - Fixed Header Columns: The header columns that do not move while scrolling
 *   vertically or horizontally.
 *
 * - Scrollable Header Columns: The header columns that do not move
 *   while scrolling vertically, but move horizontally with the horizontal
 *   scrolling.
 *
 * - Fixed Body Columns: The body columns that do not move while scrolling
 *   horizontally, but move vertically with the vertical scrolling.
 *
 * - Scrollable Body Columns: The body columns that move while scrolling
 *   vertically or horizontally.
 */
class FixedDataTable extends React.Component {
  static propTypes = {
    // TODO (jordan) Remove propType of width without losing documentation (moved to tableSize)
    /**
     * Pixel width of table. If all columns do not fit,
     * a horizontal scrollbar will appear.
     */
    width: PropTypes.number.isRequired,

    // TODO (jordan) Remove propType of height without losing documentation (moved to tableSize)
    /**
     * Pixel height of table. If all rows do not fit,
     * a vertical scrollbar will appear.
     *
     * Either `height` or `maxHeight` must be specified.
     */
    height: PropTypes.number,

    /**
     * Class name to be passed into parent container
     */
    className: PropTypes.string,

    // TODO (jordan) Remove propType of maxHeight without losing documentation (moved to tableSize)
    /**
     * Maximum pixel height of table. If all rows do not fit,
     * a vertical scrollbar will appear.
     *
     * Either `height` or `maxHeight` must be specified.
     */
    maxHeight: PropTypes.number,

    // TODO (jordan) Remove propType of ownerHeight without losing documentation (moved to tableSize)
    /**
     * Pixel height of table's owner, this is used in a managed scrolling
     * situation when you want to slide the table up from below the fold
     * without having to constantly update the height on every scroll tick.
     * Instead, vary this property on scroll. By using `ownerHeight`, we
     * over-render the table while making sure the footer and horizontal
     * scrollbar of the table are visible when the current space for the table
     * in view is smaller than the final, over-flowing height of table. It
     * allows us to avoid resizing and reflowing table when it is moving in the
     * view.
     *
     * This is used if `ownerHeight < height` (or `maxHeight`).
     */
    ownerHeight: PropTypes.number,

    // TODO (jordan) Remove propType of overflowX & overflowY without losing documentation (moved to scrollFlags)
    overflowX: PropTypes.oneOf(['hidden', 'auto']),
    overflowY: PropTypes.oneOf(['hidden', 'auto']),

    /**
     * Boolean flag indicating of touch scrolling should be enabled
     * This feature is current in beta and may have bugs
     */
    touchScrollEnabled: PropTypes.bool,

    /**
     * Boolean flags to control if scrolling with keys is enabled
     */
    keyboardScrollEnabled: PropTypes.bool,
    keyboardPageEnabled: PropTypes.bool,

    /**
     * Scrollbar X to be rendered
     */
    scrollbarX: PropTypes.node,
    /**
     * Height to be reserved for scrollbar X
     */
    scrollbarXHeight: PropTypes.number,
    /**
     * Scrollbar Y to be rendered
     */
    scrollbarY: PropTypes.node,
    /**
     * Width to be reserved for scrollbar Y
     */
    scrollbarYWidth: PropTypes.number,
    /**
     * Function to listen to scroll bars related updates like scroll position, visible rows height, all rows height,....
     */
    onScrollBarsUpdate: PropTypes.func,
    // TODO Remove propType of defaultScrollbars without losing documentation (this is required for FixedDataTableContainer only)
    /**
     * Default scrollbars provided by FDT-2 will be rendered, pass false if you want to render custom scrollbars (by passing scrollbarX and scrollbarY props)
     */
    defaultScrollbars: PropTypes.bool,

    // TODO (jordan) Remove propType of showScrollbarX & showScrollbarY without losing documentation (moved to scrollFlags)
    /**
     * Hide the scrollbar but still enable scroll functionality
     */
    showScrollbarX: PropTypes.bool,
    showScrollbarY: PropTypes.bool,

    /**
     * Callback when horizontally scrolling the grid.
     *
     * Return false to stop propagation.
     */
    onHorizontalScroll: PropTypes.func,

    /**
     * Callback when vertically scrolling the grid.
     *
     * Return false to stop propagation.
     */
    onVerticalScroll: PropTypes.func,

    // TODO (jordan) Remove propType of rowsCount without losing documentation (moved to rowSettings)
    /**
     * Number of rows in the table.
     */
    rowsCount: PropTypes.number.isRequired,

    // TODO (jordan) Remove propType of rowHeight without losing documentation (moved to rowSettings)
    /**
     * Pixel height of rows unless `rowHeightGetter` is specified and returns
     * different value.
     */
    rowHeight: PropTypes.number.isRequired,

    // TODO (jordan) Remove propType of rowHeightGetter without losing documentation (moved to rowSettings)
    /**
     * If specified, `rowHeightGetter(index)` is called for each row and the
     * returned value overrides `rowHeight` for particular row.
     */
    rowHeightGetter: PropTypes.func,

    // TODO (jordan) Remove propType of subRowHeight without losing documentation (moved to rowSettings)
    /**
     * Pixel height of sub-row unless `subRowHeightGetter` is specified and returns
     * different value.  Defaults to 0 and no sub-row being displayed.
     */
    subRowHeight: PropTypes.number,

    // TODO (jordan) Remove propType of subRowHeightGetter without losing documentation (moved to rowSettings)
    /**
     * If specified, `subRowHeightGetter(index)` is called for each row and the
     * returned value overrides `subRowHeight` for particular row.
     */
    subRowHeightGetter: PropTypes.func,

    /**
     * The row expanded for table row.
     * This can either be a React element, or a function that generates
     * a React Element. By default, the React element passed in can expect to
     * receive the following props:
     *
     * ```
     * props: {
     *   rowIndex; number // (the row index)
     *   height: number // (supplied from subRowHeight or subRowHeightGetter)
     *   width: number // (supplied from the Table)
     * }
     * ```
     *
     * Because you are passing in your own React element, you can feel free to
     * pass in whatever props you may want or need.
     *
     * If you pass in a function, you will receive the same props object as the
     * first argument.
     */
    rowExpanded: PropTypes.oneOfType([PropTypes.element, PropTypes.func]),

    /**
     * To get any additional CSS classes that should be added to a row,
     * `rowClassNameGetter(index)` is called.
     */
    rowClassNameGetter: PropTypes.func,

    /**
     * If specified, `rowKeyGetter(index)` is called for each row and the
     * returned value overrides `key` for the particular row.
     */
    rowKeyGetter: PropTypes.func,

    // TODO (jordan) Remove propType of groupHeaderHeight without losing documentation (moved to elementHeights)
    /**
     * Pixel height of the column group header.
     */
    groupHeaderHeight: PropTypes.number,

    // TODO (jordan) Remove propType of headerHeight without losing documentation (moved to elementHeights)
    /**
     * Pixel height of header.
     */
    headerHeight: PropTypes.number.isRequired,

    /**
     * Pixel height of fixedDataTableCellGroupLayout/cellGroupWrapper.
     * Default is headerHeight and groupHeaderHeight.
     *
     * This can be used with CSS to make a header cell span both the group & normal header row.
     * Setting this to a value larger than height will cause the content to
     * overflow the height. This is useful when adding a 2nd table as the group
     * header and vertically merging the 2 headers when a column is not part
     * of a group. Here are the necessary CSS changes:
     *
     * Both headers:
     *  - cellGroupWrapper needs overflow-x: hidden and pointer-events: none
     *  - cellGroup needs pointer-events: auto to reenable them on child els
     * Group header:
     *  - Layout/main needs overflow: visible and a higher z-index
     *  - CellLayout/main needs overflow-y: visible
     *  - cellGroup needs overflow: visible
     */
    cellGroupWrapperHeight: PropTypes.number,

    // TODO (jordan) Remove propType of footerHeight without losing documentation (moved to elementHeights)
    /**
     * Pixel height of footer.
     */
    footerHeight: PropTypes.number,

    /**
     * Value of horizontal scroll.
     */
    scrollLeft: PropTypes.number,

    // TODO (jordan) Remove propType of scrollToRow & scrollToColumn without losing documentation
    /**
     * Index of column to scroll to.
     */
    scrollToColumn: PropTypes.number,

    /**
     * Value of vertical scroll.
     */
    scrollTop: PropTypes.number,

    /**
     * Index of row to scroll to.
     */
    scrollToRow: PropTypes.number,

    /**
     * Callback that is called when scrolling starts. The current horizontal and vertical scroll values,
     * and the current first and last row indexes will be provided to the callback.
     */
    onScrollStart: PropTypes.func,

    /**
     * Callback that is called when scrolling ends. The new horizontal and vertical scroll values,
     * and the new first and last row indexes will be provided to the callback.
     */
    onScrollEnd: PropTypes.func,

    /**
     * If enabled scroll events will not be propagated outside of the table.
     */
    stopReactWheelPropagation: PropTypes.bool,

    /**
     * If enabled scroll events will never be bubbled to the browser default handler.
     * If disabled (default when unspecified), scroll events will be bubbled up if the scroll
     * doesn't lead to a change in scroll offsets, which is preferable if you like
     * the page/container to scroll up when the table is already scrolled up max.
     */
    stopScrollDefaultHandling: PropTypes.bool,

    /**
     * If enabled scroll events will not be propagated outside of the table.
     */
    stopScrollPropagation: PropTypes.bool,

    /**
     * Callback that is called when `rowHeightGetter` returns a different height
     * for a row than the `rowHeight` prop. This is necessary because initially
     * table estimates heights of some parts of the content.
     */
    onContentHeightChange: PropTypes.func,

    /**
     * Callback that is called when a row is clicked.
     */
    onRowClick: PropTypes.func,

    /**
     * Callback that is called when a contextual-menu event happens on a row.
     */
    onRowContextMenu: PropTypes.func,

    /**
     * Callback that is called when a row is double clicked.
     */
    onRowDoubleClick: PropTypes.func,

    /**
     * Callback that is called when a mouse-down event happens on a row.
     */
    onRowMouseDown: PropTypes.func,

    /**
     * Callback that is called when a mouse-up event happens on a row.
     */
    onRowMouseUp: PropTypes.func,

    /**
     * Callback that is called when a mouse-enter event happens on a row.
     */
    onRowMouseEnter: PropTypes.func,

    /**
     * Callback that is called when a mouse-leave event happens on a row.
     */
    onRowMouseLeave: PropTypes.func,

    /**
     * Callback that is called when a touch-start event happens on a row.
     */
    onRowTouchStart: PropTypes.func,

    /**
     * Callback that is called when a touch-end event happens on a row.
     */
    onRowTouchEnd: PropTypes.func,

    /**
     * Callback that is called when a touch-move event happens on a row.
     */
    onRowTouchMove: PropTypes.func,

    /**
     * Callback that is called when resizer has been released
     * and column needs to be updated.
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
     * Whether a column is currently being resized.
     */
    isColumnResizing: PropTypes.bool,

    /**
     * Whether columns are currently being reordered.
     */
    isColumnReordering: PropTypes.bool,

    /**
     * Whether the grid should be in RTL mode
     */
    isRTL: PropTypes.bool,

    // TODO (jordan) Remove propType of bufferRowCount without losing documentation
    /**
     * The number of rows outside the viewport to prerender. Defaults to roughly
     * half of the number of visible rows.
     */
    bufferRowCount: PropTypes.number,

    // TODO (pradeep): Move elementHeights to a selector instead of passing it through redux as state variables
    /**
     * Row heights of the header, groupheader, footer, and cell group wrapper
     * grouped into a single object.
     *
     * @ignore
     */
    elementHeights: PropTypes.shape({
      cellGroupWrapperHeight: PropTypes.number,
      footerHeight: PropTypes.number,
      groupHeaderHeight: PropTypes.number,
      headerHeight: PropTypes.number,
    }),

    /**
     * Callback that returns an object of html attributes to add to the grid element
     */
    gridAttributesGetter: PropTypes.func,

    // TODO (pradeep) Remove propType of rowAttributesGetter without losing documentation (moved to rowSettings)
    /**
     * Callback that returns an object of html attributes to add to each row element.
     *
     * ```
     * function(rowIndex: number)
     * ```
     */
    rowAttributesGetter: PropTypes.func,
  };

  static defaultProps = /*object*/ {
    elementHeights: {
      cellGroupWrapperHeight: undefined,
      footerHeight: 0,
      groupHeaderHeight: 0,
      headerHeight: 0,
    },
    keyboardScrollEnabled: false,
    keyboardPageEnabled: false,
    touchScrollEnabled: false,
    stopScrollPropagation: false,
  };

  constructor(props) {
    super(props);

    this._didScrollStop = debounceCore(this._didScrollStopSync, 200, this);
    this._onKeyDown = this._onKeyDown.bind(this);

    this._wheelHandler = new ReactWheelHandler(
      this._onScroll,
      this._shouldHandleWheelX,
      this._shouldHandleWheelY,
      this.props.isRTL,
      this.props.stopScrollDefaultHandling,
      this.props.stopScrollPropagation
    );

    this._touchHandler = new ReactTouchHandler(
      this._onScroll,
      this._shouldHandleTouchX,
      this._shouldHandleTouchY,
      this.props.stopScrollDefaultHandling,
      this.props.stopScrollPropagation
    );
  }

  componentWillUnmount() {
    // TODO (pradeep): Remove these and pass to our table component directly after
    // React provides an API where event handlers can be specified to be non-passive (facebook/react#6436)
    this._divRef &&
      this._divRef.removeEventListener('wheel', this._wheelHandler.onWheel, {
        passive: false,
      });
    this._divRef &&
      this._divRef.removeEventListener(
        'touchmove',
        this._touchHandler.onTouchMove,
        { passive: false }
      );
    this._wheelHandler = null;
    this._touchHandler = null;

    // Cancel any pending debounced scroll handling and handle immediately.
    this._didScrollStop.reset();
    this._didScrollStopSync();
  }

  _shouldHandleTouchX = (/*number*/ delta) /*boolean*/ =>
    this.props.touchScrollEnabled && this._shouldHandleWheelX(delta);

  _shouldHandleTouchY = (/*number*/ delta) /*boolean*/ =>
    this.props.touchScrollEnabled && this._shouldHandleWheelY(delta);

  _shouldHandleWheelX = (/*number*/ delta) /*boolean*/ => {
    const { maxScrollX, scrollFlags, scrollX } = this.props;
    const { overflowX } = scrollFlags;

    if (overflowX === 'hidden') {
      return false;
    }

    delta = Math.round(delta);
    if (delta === 0) {
      return false;
    }

    return (delta < 0 && scrollX > 0) || (delta >= 0 && scrollX < maxScrollX);
  };

  _shouldHandleWheelY = (/*number*/ delta) /*boolean*/ => {
    const { maxScrollY, scrollFlags, scrollY } = this.props;
    const { overflowY } = scrollFlags;

    if (overflowY === 'hidden' || delta === 0) {
      return false;
    }

    delta = Math.round(delta);
    if (delta === 0) {
      return false;
    }

    return (delta < 0 && scrollY > 0) || (delta >= 0 && scrollY < maxScrollY);
  };

  _onKeyDown(event) {
    const { scrollbarYHeight } = tableHeightsSelector(this.props);
    if (this.props.keyboardPageEnabled) {
      switch (event.key) {
        case 'PageDown':
          this._onScroll(0, scrollbarYHeight);
          event.preventDefault();
          break;

        case 'PageUp':
          this._onScroll(0, scrollbarYHeight * -1);
          event.preventDefault();
          break;

        default:
          break;
      }
    }
    if (this.props.keyboardScrollEnabled) {
      switch (event.key) {
        case 'ArrowDown':
          this._onScroll(0, ARROW_SCROLL_SPEED);
          event.preventDefault();
          break;

        case 'ArrowUp':
          this._onScroll(0, ARROW_SCROLL_SPEED * -1);
          event.preventDefault();
          break;

        case 'ArrowRight':
          this._onScroll(ARROW_SCROLL_SPEED, 0);
          event.preventDefault();
          break;

        case 'ArrowLeft':
          this._onScroll(ARROW_SCROLL_SPEED * -1, 0);
          event.preventDefault();
          break;

        default:
          break;
      }
    }
  }

  _reportContentHeight = () => {
    const { contentHeight } = tableHeightsSelector(this.props);
    const { onContentHeightChange } = this.props;

    if (contentHeight !== this._contentHeight && onContentHeightChange) {
      onContentHeightChange(contentHeight);
    }
    this._contentHeight = contentHeight;
  };

  shouldComponentUpdate(nextProps) {
    return !shallowEqual(this.props, nextProps);
  }

  componentDidMount() {
    this._divRef &&
      this._divRef.addEventListener('wheel', this._wheelHandler.onWheel, {
        passive: false,
      });
    if (this.props.touchScrollEnabled) {
      this._divRef &&
        this._divRef.addEventListener(
          'touchmove',
          this._touchHandler.onTouchMove,
          { passive: false }
        );
    }
    this._reportContentHeight();
    this._reportScrollBarsUpdates();
  }

  componentDidUpdate(/*object*/ prevProps) {
    this._didScroll(prevProps);
    this._reportContentHeight();
    this._reportScrollBarsUpdates();
  }

  /**
   * Method to report scrollbars updates
   * @private
   */
  _reportScrollBarsUpdates() {
    const {
      bodyOffsetTop,
      scrollbarXOffsetTop,
      visibleRowsHeight,
    } = tableHeightsSelector(this.props);
    const {
      tableSize: { width },
      scrollContentHeight,
      scrollY,
      scrollX,
    } = this.props;
    const newScrollState = {
      viewportHeight: visibleRowsHeight,
      contentHeight: scrollContentHeight,
      scrollbarYOffsetTop: bodyOffsetTop,
      scrollY,
      viewportWidth: width,
      contentWidth: width + this.props.maxScrollX,
      scrollbarXOffsetTop,
      scrollX,
      scrollTo: this._scrollTo,
      scrollToX: this._scrollToX,
      scrollToY: this._scrollToY,
    };
    if (!shallowEqual(this.previousScrollState, newScrollState)) {
      this.props.onScrollBarsUpdate(newScrollState);
      this.previousScrollState = newScrollState;
    }
  }

  render() /*object*/ {
    const {
      ariaGroupHeaderIndex,
      ariaHeaderIndex,
      ariaFooterIndex,
      ariaRowCount,
      ariaRowIndexOffset,
    } = ariaAttributesSelector(this.props);

    const {
      fixedColumnGroups,
      fixedColumns,
      fixedRightColumnGroups,
      fixedRightColumns,
      scrollableColumnGroups,
      scrollableColumns,
    } = columnTemplatesSelector(this.props);

    const {
      bodyHeight,
      bodyOffsetTop,
      componentHeight,
      footOffsetTop,
      scrollbarXOffsetTop,
      visibleRowsHeight,
    } = tableHeightsSelector(this.props);

    const {
      className,
      columnReorderingData,
      columnResizingData,
      elementHeights,
      isColumnReordering,
      isColumnResizing,
      gridAttributesGetter,
      maxScrollX,
      maxScrollY,
      onColumnReorderEndCallback,
      onColumnResizeEndCallback,
      scrollContentHeight,
      scrollX,
      scrollY,
      scrolling,
      tableSize,
      touchScrollEnabled,
      scrollbarYWidth,
    } = this.props;

    const { ownerHeight, width } = tableSize;
    const {
      cellGroupWrapperHeight,
      footerHeight,
      groupHeaderHeight,
      headerHeight,
    } = elementHeights;
    const { scrollEnabledX, scrollEnabledY } = scrollbarsVisible(this.props);
    const onColumnReorder = onColumnReorderEndCallback
      ? this._onColumnReorder
      : null;
    const attributes = gridAttributesGetter && gridAttributesGetter();

    let groupHeader;
    if (groupHeaderHeight > 0) {
      groupHeader = (
        <FixedDataTableRow
          key="group_header"
          ariaRowIndex={ariaGroupHeaderIndex}
          isHeaderOrFooter={true}
          isScrolling={scrolling}
          className={joinClasses(
            cx('fixedDataTableLayout/header'),
            cx('public/fixedDataTable/header')
          )}
          width={width}
          height={groupHeaderHeight}
          cellGroupWrapperHeight={cellGroupWrapperHeight}
          index={0}
          zIndex={1}
          offsetTop={0}
          scrollLeft={scrollX}
          fixedColumns={fixedColumnGroups}
          fixedRightColumns={fixedRightColumnGroups}
          scrollableColumns={scrollableColumnGroups}
          visible={true}
          onColumnResize={this._onColumnResize}
          onColumnReorder={onColumnReorder}
          onColumnReorderMove={this._onColumnReorderMove}
          showScrollbarY={scrollEnabledY}
          scrollbarYWidth={scrollbarYWidth}
          isRTL={this.props.isRTL}
        />
      );
    }

    let scrollbarY;
    if (scrollEnabledY) {
      scrollbarY = this.props.scrollbarY;
    }

    let scrollbarX;
    if (scrollEnabledX) {
      scrollbarX = this.props.scrollbarX;
    }

    const dragKnob = (
      <ColumnResizerLine
        height={componentHeight}
        initialWidth={columnResizingData.width || 0}
        minWidth={columnResizingData.minWidth || 0}
        maxWidth={columnResizingData.maxWidth || Number.MAX_VALUE}
        visible={!!isColumnResizing}
        leftOffset={columnResizingData.left || 0}
        knobHeight={headerHeight}
        initialEvent={columnResizingData.initialEvent}
        onColumnResizeEnd={onColumnResizeEndCallback}
        columnKey={columnResizingData.key}
        touchEnabled={touchScrollEnabled}
        isRTL={this.props.isRTL}
      />
    );

    let footer = null;
    if (footerHeight) {
      footer = (
        <FixedDataTableRow
          key="footer"
          ariaRowIndex={ariaFooterIndex}
          isHeaderOrFooter={true}
          isScrolling={scrolling}
          className={joinClasses(
            cx('fixedDataTableLayout/footer'),
            cx('public/fixedDataTable/footer')
          )}
          width={width}
          height={footerHeight}
          index={-1}
          zIndex={1}
          offsetTop={footOffsetTop}
          visible={true}
          fixedColumns={fixedColumns.footer}
          fixedRightColumns={fixedRightColumns.footer}
          scrollableColumns={scrollableColumns.footer}
          scrollLeft={scrollX}
          showScrollbarY={scrollEnabledY}
          scrollbarYWidth={scrollbarYWidth}
          isRTL={this.props.isRTL}
        />
      );
    }

    const rows = this._renderRows(
      bodyOffsetTop,
      fixedColumns.cell,
      fixedRightColumns.cell,
      scrollableColumns.cell,
      bodyHeight,
      ariaRowIndexOffset
    );

    const header = (
      <FixedDataTableRow
        key="header"
        ariaRowIndex={ariaHeaderIndex}
        isHeaderOrFooter={true}
        isScrolling={scrolling}
        className={joinClasses(
          cx('fixedDataTableLayout/header'),
          cx('public/fixedDataTable/header')
        )}
        width={width}
        height={headerHeight}
        cellGroupWrapperHeight={cellGroupWrapperHeight}
        index={-1}
        zIndex={1}
        offsetTop={groupHeaderHeight}
        scrollLeft={scrollX}
        visible={true}
        fixedColumns={fixedColumns.header}
        fixedRightColumns={fixedRightColumns.header}
        scrollableColumns={scrollableColumns.header}
        touchEnabled={touchScrollEnabled}
        onColumnResize={this._onColumnResize}
        onColumnReorder={onColumnReorder}
        onColumnReorderMove={this._onColumnReorderMove}
        onColumnReorderEnd={this._onColumnReorderEnd}
        isColumnReordering={!!isColumnReordering}
        columnReorderingData={columnReorderingData}
        showScrollbarY={scrollEnabledY}
        scrollbarYWidth={scrollbarYWidth}
        isRTL={this.props.isRTL}
      />
    );

    let topShadow;
    if (scrollY) {
      topShadow = (
        <div
          className={joinClasses(
            cx('fixedDataTableLayout/topShadow'),
            cx('public/fixedDataTable/topShadow')
          )}
          style={{ top: bodyOffsetTop }}
        />
      );
    }

    // ownerScrollAvailable is true if the rows rendered will overflow the owner element
    // so we show a shadow in that case even if the FDT component can't scroll anymore
    const ownerScrollAvailable =
      ownerHeight &&
      ownerHeight < componentHeight &&
      scrollContentHeight > visibleRowsHeight;
    let bottomShadow;
    if (ownerScrollAvailable || scrollY < maxScrollY) {
      bottomShadow = (
        <div
          className={joinClasses(
            cx('fixedDataTableLayout/bottomShadow'),
            cx('public/fixedDataTable/bottomShadow')
          )}
          style={{ top: footOffsetTop }}
        />
      );
    }
    var tabIndex = null;
    if (this.props.keyboardPageEnabled || this.props.keyboardScrollEnabled) {
      tabIndex = 0;
    }

    let tableClassName = className;
    if (this.props.isRTL) {
      tableClassName = joinClasses(tableClassName, 'fixedDataTable_isRTL');
    }

    return (
      <div
        className={joinClasses(
          tableClassName,
          cx('fixedDataTableLayout/main'),
          cx('public/fixedDataTable/main')
        )}
        role="grid"
        aria-rowcount={ariaRowCount}
        {...attributes}
        tabIndex={tabIndex}
        onKeyDown={this._onKeyDown}
        onTouchStart={
          touchScrollEnabled ? this._touchHandler.onTouchStart : null
        }
        onTouchEnd={touchScrollEnabled ? this._touchHandler.onTouchEnd : null}
        onTouchCancel={
          touchScrollEnabled ? this._touchHandler.onTouchCancel : null
        }
        ref={this._onRef}
        style={{
          height: componentHeight,
          width,
        }}
      >
        <div
          className={cx('fixedDataTableLayout/rowsContainer')}
          style={{
            height: scrollbarXOffsetTop,
            width,
          }}
        >
          {dragKnob}
          {groupHeader}
          {header}
          {rows}
          {footer}
          {topShadow}
          {bottomShadow}
        </div>
        {scrollbarY}
        {scrollbarX}
      </div>
    );
  }

  _renderRows = (
    /*number*/ offsetTop,
    fixedCellTemplates,
    fixedRightCellTemplates,
    scrollableCellTemplates,
    bodyHeight,
    /*number*/ ariaRowIndexOffset
  ) /*object*/ => {
    const { scrollEnabledY } = scrollbarsVisible(this.props);
    const props = this.props;
    return (
      <FixedDataTableBufferedRows
        ariaRowIndexOffset={ariaRowIndexOffset}
        isScrolling={props.scrolling}
        fixedColumns={fixedCellTemplates}
        fixedRightColumns={fixedRightCellTemplates}
        firstViewportRowIndex={props.firstRowIndex}
        endViewportRowIndex={props.endRowIndex}
        height={bodyHeight}
        offsetTop={offsetTop}
        onRowClick={props.onRowClick}
        onRowContextMenu={props.onRowContextMenu}
        onRowDoubleClick={props.onRowDoubleClick}
        onRowMouseUp={props.onRowMouseUp}
        onRowMouseDown={props.onRowMouseDown}
        onRowMouseEnter={props.onRowMouseEnter}
        onRowMouseLeave={props.onRowMouseLeave}
        onRowTouchStart={
          props.touchScrollEnabled ? props.onRowTouchStart : null
        }
        onRowTouchEnd={props.touchScrollEnabled ? props.onRowTouchEnd : null}
        onRowTouchMove={props.touchScrollEnabled ? props.onRowTouchMove : null}
        rowClassNameGetter={props.rowClassNameGetter}
        rowExpanded={props.rowExpanded}
        rowKeyGetter={props.rowKeyGetter}
        rowSettings={props.rowSettings}
        scrollLeft={props.scrollX}
        scrollTop={props.scrollY}
        scrollableColumns={scrollableCellTemplates}
        showLastRowBorder={true}
        width={props.tableSize.width}
        rowsToRender={props.rows}
        rowOffsets={props.rowOffsets}
        showScrollbarY={scrollEnabledY}
        scrollbarYWidth={props.scrollbarYWidth}
        isRTL={props.isRTL}
      />
    );
  };

  _onRef = (div) => {
    this._divRef = div;
    if (this.props.stopReactWheelPropagation) {
      this._wheelHandler.setRoot(div);
    }
  };

  /**
   * This is called when a cell that is in the header of a column has its
   * resizer knob clicked on. It displays the resizer and puts in the correct
   * location on the table.
   */
  _onColumnResize = (
    /*number*/ combinedWidth,
    /*number*/ leftOffset,
    /*number*/ cellWidth,
    /*?number*/ cellMinWidth,
    /*?number*/ cellMaxWidth,
    /*number|string*/ columnKey,
    /*object*/ event
  ) => {
    const coordinates = FixedDataTableEventHelper.getCoordinatesFromEvent(
      event
    );
    const clientX = coordinates.x;
    const clientY = coordinates.y;
    this.props.columnActions.resizeColumn({
      cellMinWidth,
      cellMaxWidth,
      cellWidth,
      columnKey,
      combinedWidth,
      clientX,
      clientY,
      leftOffset,
    });
  };

  _onColumnReorder = (
    /*string*/ columnKey,
    /*number*/ width,
    /*number*/ left,
    /*object*/ event
  ) => {
    this.props.columnActions.startColumnReorder({
      scrollStart: this.props.scrollX,
      columnKey,
      width,
      left,
    });
  };

  _onColumnReorderMove = (/*number*/ deltaX) => {
    this.props.columnActions.moveColumnReorder(deltaX);
  };

  _onColumnReorderEnd = (/*object*/ props, /*object*/ event) => {
    const {
      columnActions,
      columnReorderingData: {
        cancelReorder,
        columnAfter,
        columnBefore,
        columnKey,
        scrollStart,
      },
      onColumnReorderEndCallback,
      onHorizontalScroll,
      scrollX,
    } = this.props;

    columnActions.stopColumnReorder();
    if (cancelReorder) {
      return;
    }

    onColumnReorderEndCallback({
      columnAfter,
      columnBefore,
      reorderColumn: columnKey,
    });

    if (scrollStart !== scrollX && onHorizontalScroll) {
      onHorizontalScroll(scrollX);
    }
  };

  _onScroll = (/*number*/ deltaX, /*number*/ deltaY) => {
    const {
      maxScrollX,
      maxScrollY,
      onHorizontalScroll,
      onVerticalScroll,
      scrollActions,
      scrollFlags,
      scrollX,
      scrollY,
      firstRowIndex,
      endRowIndex,
    } = this.props;
    const { overflowX, overflowY } = scrollFlags;

    let x = scrollX;
    let y = scrollY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && overflowY !== 'hidden') {
      y += deltaY;
      y = y < 0 ? 0 : y;
      y = y > maxScrollY ? maxScrollY : y;

      //NOTE (jordan) This is a hacky workaround to prevent FDT from setting its internal state
      if (
        onVerticalScroll
          ? onVerticalScroll(y, firstRowIndex, endRowIndex)
          : true
      ) {
        scrollActions.scrollToY(y);
      }
    } else if (deltaX && overflowX !== 'hidden') {
      x += deltaX;
      x = x < 0 ? 0 : x;
      x = x > maxScrollX ? maxScrollX : x;

      // This is a workaround to prevent content blurring. This happens when translate3d
      // is applied with non-rounded values to elements having text.
      var roundedX = Math.round(x);

      //NOTE (asif) This is a hacky workaround to prevent FDT from setting its internal state
      if (onHorizontalScroll ? onHorizontalScroll(roundedX) : true) {
        scrollActions.scrollToX(roundedX);
      }
    }
  };

  _scrollTo = (/*number*/ scrollX, /*number*/ scrollY) => {
    this._scrollToX(scrollX);
    this._scrollToY(scrollY);
  };

  _scrollToX = (/*number*/ scrollPos) => {
    const {
      onHorizontalScroll,
      scrollActions,
      scrollX,
      scrolling,
    } = this.props;

    if (scrollPos === scrollX) {
      return;
    }

    // This is a workaround to prevent content blurring. This happens when translate3d
    // is applied with non-rounded values to elements having text.
    var roundedScrollPos = Math.round(scrollPos);

    if (onHorizontalScroll ? onHorizontalScroll(roundedScrollPos) : true) {
      scrollActions.scrollToX(roundedScrollPos);
    }
  };

  _scrollToY = (/*number*/ scrollPos) => {
    const {
      onVerticalScroll,
      scrollActions,
      scrollY,
      firstRowIndex,
      endRowIndex,
    } = this.props;

    if (scrollPos === scrollY) {
      return;
    }

    if (
      onVerticalScroll
        ? onVerticalScroll(scrollPos, firstRowIndex, endRowIndex)
        : true
    ) {
      scrollActions.scrollToY(scrollPos);
    }
  };

  /**
   * Calls the user specified scroll callbacks -- onScrollStart, onScrollEnd, onHorizontalScroll, and onVerticalScroll.
   */
  _didScroll = (/* !object */ prevProps) => {
    const {
      onScrollStart,
      scrollX,
      scrollY,
      onHorizontalScroll,
      onVerticalScroll,
      tableSize: { ownerHeight },
      scrolling,
      firstRowIndex,
      endRowIndex,
    } = this.props;

    const {
      endRowIndex: oldEndRowIndex,
      firstRowIndex: oldFirstRowIndex,
      scrollX: oldScrollX,
      scrollY: oldScrollY,
      tableSize: { ownerHeight: oldOwnerHeight },
      scrolling: oldScrolling,
    } = prevProps;

    // check if scroll values have changed - we have an extra check on NaN because (NaN !== NaN)
    const ownerHeightChanged =
      ownerHeight !== oldOwnerHeight &&
      !(isNaN(ownerHeight) && isNaN(oldOwnerHeight));
    const scrollXChanged = scrollX !== oldScrollX;
    const scrollYChanged = scrollY !== oldScrollY;

    // if none of the above changed, then a scroll didn't happen at all
    if (!ownerHeightChanged && !scrollXChanged && !scrollYChanged) {
      return;
    }

    // only call onScrollStart if scrolling wasn't on previously
    if (!oldScrolling && scrolling && onScrollStart) {
      onScrollStart(oldScrollX, oldScrollY, oldFirstRowIndex, oldEndRowIndex);
    }

    if (scrollXChanged && onHorizontalScroll) {
      onHorizontalScroll(scrollX);
    }

    if (scrollYChanged && onVerticalScroll) {
      onVerticalScroll(scrollY, firstRowIndex, endRowIndex);
    }

    // debounced version of didScrollStop as we don't immediately stop scrolling
    this._didScrollStop();
  };

  // We need two versions of this function, one to finish up synchronously (for
  // example, in componentWillUnmount), and a debounced version for normal
  // scroll handling.
  _didScrollStopSync = () => {
    const {
      endRowIndex,
      firstRowIndex,
      onScrollEnd,
      scrollActions,
      scrollX,
      scrollY,
      scrolling,
    } = this.props;

    if (!scrolling) {
      return;
    }

    scrollActions.stopScroll();

    if (onScrollEnd) {
      onScrollEnd(scrollX, scrollY, firstRowIndex, endRowIndex);
    }
  };
}

export default FixedDataTable;
