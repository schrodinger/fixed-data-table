/**
 * Copyright Schrodinger, LLC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FixedDataTableRoot
 */

'use strict';

import Table from 'FixedDataTableContainer';
import Cell from 'FixedDataTableCellDefault';
import Column from 'FixedDataTableColumn';
import ColumnGroup from 'FixedDataTableColumnGroup';
import ResizeReorderCell from 'ResizeReorderCell';
import { PluginContext } from './Context';

const version = '1.1.0';

const Plugins = {
  ResizeReorderCell,
  PluginContext
};

export {
  Cell,
  Column,
  ColumnGroup,
  Table,
  Plugins,
  version,
};
