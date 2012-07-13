/***

ColumnSetterGetter

The following code fundimentally changes the way grids read/write data from a store.
It shifts the responsibility for read/write from a record away from the grid code, and onto the column definition.

The point is that now you can specify custom setter/getter functions in your column spec, and access data your way.
This is of particular utility if you're using nested record relationships, complex json data in a given field, etc.
Falls back gracefully to the typical dataIndex behavior if you leave getter/setter unspecified.
Also provides a handy checkModified config parameter.

This code is copyright 2012 Daniel Norman.
It is free for use under the MIT licence.

***/


Ext.ns('Ext.patch');
Ext.patch.ColumnSetterGetter = true;

Ext.syncRequire(['Ext.patch.deepEquals']);

// THIS CODE SHIFTS THE GET/SET RESPONSIBILITY ONTO THE COLUMN OBJECT
Ext.override(Ext.grid.column.Column, {
    initComponent: function() {
        var me = this;
        
        me.callOverridden(arguments);
        
        // TODO - populate a phony dataIndex for naked setter/getter pairs, so shouldUpdateCell has something to go on.
        // ALSO - column.hasCustomRenderer is potentially an unnecessary performance hit in some situations
        // TODO - split by slash to populate displayIndex
        
        if( me.dataIndex ) Ext.applyIf(me,{
                getter:        function(r){     return r.get( me.dataIndex        ) },
                setter:        function(r, v){  return r.set( me.dataIndex, v     ) },
                checkModified: function(r){     return r.isModified( me.dataIndex ) }
            });
        if ( me.displayIndex ) Ext.applyIf(me,{
                displayGetter: function(r)  { return r.get( me.displayIndex    ) },
                displaySetter: function(r,v){ return r.set( me.displayIndex, v ) }
            });
        
        Ext.applyIf(me, {
            getter: Ext.emptyFn, displayGetter: me.getter || Ext.emptyFn,
            setter: Ext.emptyFn, displaySetter: me.setter || Ext.emptyFn,
            checkModified: Ext.emptyFn
        });
        
    }
});

Ext.override(Ext.view.Table, {
    shouldUpdateCell: function(column, changedFieldNames){
       
        if( typeof column.shouldUpdate == 'function' ){        // ADDED
            return column.shouldUpdate( changedFieldNames );   // ADDED
        }else if (column.hasCustomRenderer) {                  // MODIFIED
            return true;
        }
        return !changedFieldNames || Ext.Array.contains(changedFieldNames, column.dataIndex);
   }
});

Ext.override(Ext.data.Model, {
    isEqual: Ext.deepEquals
});
// BELOW THIS LINE - MINOR TWEAKS ONLY. CHANGES TO 4.1rc1 ARE ANNOTATED

Ext.override(Ext.grid.header.Container,{
    prepareData: function(data, rowIdx, record, view, panel) {
        var me        = this,
            obj       = {},
            headers   = me.gridDataColumns || me.getGridColumns(),
            headersLn = headers.length,
            colIdx    = 0,
            header,
            headerId,
            renderer,
            value,
            metaData,
            store = panel.store;

        for (; colIdx < headersLn; colIdx++) {
            metaData = {
                tdCls: '',
                style: ''
            };
            header = headers[colIdx];
            headerId = header.id;
            renderer = header.renderer;
            // MODIFICATION  -  MODIFICATION  -  MODIFICATION  -  MODIFICATION
            value    = header.displayGetter(record);
            // END END END END END END END END END END END END END END END END 

            if (typeof renderer == "function") {
                value = renderer.call(
                    header.scope || me.ownerCt,
                    value,
                    // metadata per cell passing an obj by reference so that
                    // it can be manipulated inside the renderer
                    metaData,
                    record,
                    rowIdx,
                    colIdx,
                    store,
                    view
                );
            }

            // <debug>
            if (metaData.css) {
                // This warning attribute is used by the compat layers
                obj.cssWarning = true;
                metaData.tdCls = metaData.css;
                delete metaData.css;
            }
            // </debug>
            if (me.markDirty) {
                // MODIFICATION  -  MODIFICATION  -  MODIFICATION  -  MODIFICATION
                obj[headerId + '-modified'] = header.checkModified( record )     ? Ext.baseCSSPrefix + 'grid-dirty-cell' : '';
                // END END END END END END END END END END END END END END END END
            }
            
            
            
            obj[headerId+'-tdCls'] = metaData.tdCls;
            obj[headerId+'-tdAttr'] = metaData.tdAttr;
            obj[headerId+'-style'] = metaData.style;
            if (typeof value === 'undefined' || value === null || value === '') {
                value = header.emptyCellText;
            }
            obj[headerId] = value;
        }
        return obj;
    }
});

Ext.override(Ext.grid.plugin.Editing,{
    getEditingContext: function(record, columnHeader) {
        var me = this,
            grid = me.grid,
            view = grid.getView(),
            node = view.getNode(record),
            rowIdx, colIdx;

        if(!node) return; // MODIFICATION - action column calls startEdit for some stupid reason, but the node is gone because it was a delete button
        
        // An intervening listener may have deleted the Record
        if (!node) {
            return;
        }

        // Coerce the column index to the closest visible column
        columnHeader = grid.headerCt.getVisibleHeaderClosestToIndex(Ext.isNumber(columnHeader) ? columnHeader : columnHeader.getIndex());

        // No corresponding column. Possible if all columns have been moved to the other side of a lockable grid pair
        if (!columnHeader) {
            return;
        }

        colIdx = columnHeader.getIndex();

        if (Ext.isNumber(record)) {
            // look up record if numeric row index was passed
            rowIdx = record;
            record = view.getRecord(node);
        } else {
            rowIdx = view.indexOf(node);
        }

        return {
            grid   : grid,
            record : record,
            field  : columnHeader.dataIndex,
            value  : columnHeader.displayGetter( record ), // MODIFICATION
            row    : view.getNode(rowIdx),
            column : columnHeader,
            rowIdx : rowIdx,
            colIdx : colIdx
        };
    }
});


Ext.override(Ext.Editor,{
    startEdit : function(el, value, displayValue) {
        var me = this,
            field = me.field;

        me.completeEdit();
        me.boundEl = Ext.get(el);
        value = Ext.isDefined(value) ? value : Ext.String.trim(me.boundEl.dom.innerText || me.boundEl.dom.innerHTML);

        if (!me.rendered) {
            me.render(me.parentEl || document.body);
        }

        if (me.fireEvent('beforestartedit', me, me.boundEl, value) !== false) {
            me.startValue = value;
            me.show();
            // temporarily suspend events on field to prevent the "change" event from firing when reset() and setValue() are called
            field.suspendEvents();
            field.reset();
            // HACK HACK HACK
            if( field.setValueText  ){
                field.setValueText( value, displayValue );
            }else{
                field.setValue(value);
            }
            // END HACK
            field.resumeEvents();
            me.realign(true);
            field.focus(false, 10);
            if (field.autoSize) {
                field.autoSize();
            }
            me.editing = true;
        }
    }
});
Ext.override(Ext.grid.plugin.CellEditing,{
    startEdit: function(record, columnHeader) {
        var me = this,
            context = me.getEditingContext(record, columnHeader),
            value, ed;

        // Complete the edit now, before getting the editor's target
        // cell DOM element. Completing the edit causes a row refresh.
        // Also allows any post-edit events to take effect before continuing
        me.completeEdit();
        
        // Cancel editing if EditingContext could not be found (possibly because record has been deleted by an intervening listener), or if the grid view is not currently visible
        if (!context || !me.grid.view.isVisible(true)) {
            return false;
        }

        record = context.record;
        columnHeader = context.column;

        // See if the field is editable for the requested record
        if (columnHeader && !columnHeader.getEditor(record)) {
            return false;
        }

        // MODIFICATION  -  MODIFICATION  -  MODIFICATION  -  MODIFICATION
        value        = columnHeader.getter(record),
        displayValue = columnHeader.displayGetter(record),
        // END END END END END END END END END END END END END END END END
        context.originalValue = context.value = value;
        if (me.beforeEdit(context) === false || me.fireEvent('beforeedit', me, context) === false || context.cancel) {
            return false;
        }

        ed = me.getEditor(record, columnHeader);

        // Whether we are going to edit or not, ensure the edit cell is scrolled into view
        me.grid.view.cancelFocus();
        me.view.focusCell({
            row: context.row,
            column: context.colIdx
        });
        if (ed) {
            me.context = context;
            me.setActiveEditor(ed);
            me.setActiveRecord(record);
            me.setActiveColumn(columnHeader);

            // Defer, so we have some time between view scroll to sync up the editor
            me.editTask.delay(15, ed.startEdit, ed, [me.getCell(record, columnHeader), value, displayValue ]); // MODIFICATION
            me.editing = true;
            me.scroll = me.view.el.getScroll();
            return true;
        }
        return false;
    },
    onEditComplete : function(ed, value, startValue) {
        var me = this,
            grid = me.grid,
            activeColumn = me.getActiveColumn(),
            record;

        if (activeColumn) {
            record = me.context.record;

            me.setActiveEditor(null);
            me.setActiveColumn(null);
            me.setActiveRecord(null);
    
            if (!me.validateEdit()) {
                return;
            }
            // Only update the record if the new value is different than the
            // startValue. When the view refreshes its el will gain focus
            if (!record.isEqual(value, startValue)) {
                
                // MODIFICATION  -  MODIFICATION  -  MODIFICATION  -  MODIFICATION
                // HACK - given that displaySetter doesn't yet appear to trigger the view refresh, set the display first to force display update.
                if( activeColumn.displaySetter !== activeColumn.setter ){
                    var field = ed.field || ed.editor;
                    activeColumn.displaySetter( me.context.record, field.getRawValue ? field.getRawValue() : value );
                }
                activeColumn.setter( record, value );
                // END END END END END END END END END END END END END END END END 
                
            // Restore focus back to the view's element.
            } else {
                grid.getView().getEl(activeColumn).focus();
            }
            me.context.value = value;
            me.fireEvent('edit', me, me.context);
        }
    }
});