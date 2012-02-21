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

// THIS CODE SHIFTS THE GET/SET RESPONSIBILITY ONTO THE COLUMN OBJECT
Ext.override(Ext.grid.column.Column, {
    initComponent: function() {
        var me = this;
        
        me.callOverridden(arguments);
        
        if( me.dataIndex ){
            
            if(!me.getter) me.getter = function(record){
                return record.get( me.dataIndex );
            }
            if(!me.setter) me.setter = function(record, value){
                record.set( me.dataIndex, value );
            }
            if(!me.checkModified) me.checkModified = function(record, value){
                return record.isModified( me.dataIndex );
            }
            
        }
        
        Ext.applyIf(me, {
            getter: Ext.emptyFn,
            setter: Ext.emptyFn,
            checkModified: Ext.emptyFn
        });
        
    }
});


// BELOW THIS LINE - MINOR TWEAKS ONLY. CHANGES TO 4.0.7 ARE ANNOTATED

Ext.override(Ext.grid.header.Container,{
    prepareData: function(data, rowIdx, record, view, panel) {
        var obj       = {},
            headers   = this.gridDataColumns || this.getGridColumns(),
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
            value    = header.getter(record);
            // END END END END END END END END END END END END END END END END 

            // When specifying a renderer as a string, it always resolves
            // to Ext.util.Format
            if (typeof renderer === "string") {
                header.renderer = renderer = Ext.util.Format[renderer];
            }

            if (typeof renderer === "function") {
                value = renderer.call(
                    header.scope || this.ownerCt,
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
                // This warning attribute is used by the compat layer
                obj.cssWarning = true;
                metaData.tdCls = metaData.css;
                delete metaData.css;
            }
            // </debug>
            
            // MODIFICATION  -  MODIFICATION  -  MODIFICATION  -  MODIFICATION
            obj[headerId+'-modified'] = header.checkModified( record ) ? Ext.baseCSSPrefix + 'grid-dirty-cell' : '';
            // END END END END END END END END END END END END END END END END 
            
            obj[headerId+'-tdCls'] = metaData.tdCls;
            obj[headerId+'-tdAttr'] = metaData.tdAttr;
            obj[headerId+'-style'] = metaData.style;
            if (value === undefined || value === null || value === '') {
                value = '&#160;';
            }
            obj[headerId] = value;
        }
        return obj;
    },
});

Ext.override(Ext.grid.plugin.Editing,{
    getEditingContext: function(record, columnHeader) {
        var me = this,
            grid = me.grid,
            store = grid.store,
            rowIdx,
            colIdx,
            view = grid.getView(),
            value;

        // If they'd passed numeric row, column indices, look them up.
        if (Ext.isNumber(record)) {
            rowIdx = record;
            record = store.getAt(rowIdx);
        } else {
            rowIdx = store.indexOf(record);
        }
        if (Ext.isNumber(columnHeader)) {
            colIdx = columnHeader;
            columnHeader = grid.headerCt.getHeaderAtIndex(colIdx);
        } else {
            colIdx = columnHeader.getIndex();
        }

        // MODIFICATION  -  MODIFICATION  -  MODIFICATION  -  MODIFICATION
        value = columnHeader.getter( record );
        // END END END END END END END END END END END END END END END END 

        return {
            grid: grid,
            record: record,
            field: columnHeader.dataIndex,
            value: value,
            row: view.getNode(rowIdx),
            column: columnHeader,
            rowIdx: rowIdx,
            colIdx: colIdx
        };
    },
});

Ext.override(Ext.grid.plugin.CellEditing,{
    startEdit: function(record, columnHeader) {
        var me = this,
        
            // MODIFICATION  -  MODIFICATION  -  MODIFICATION  -  MODIFICATION
            value = columnHeader.getter(record),
            // END END END END END END END END END END END END END END END END 
            
            context = me.getEditingContext(record, columnHeader),
            ed;

        record = context.record;
        columnHeader = context.column;

        // Complete the edit now, before getting the editor's target
        // cell DOM element. Completing the edit causes a view refresh.
        me.completeEdit();

        context.originalValue = context.value = value;
        if (me.beforeEdit(context) === false || me.fireEvent('beforeedit', context) === false || context.cancel) {
            return false;
        }
        
        // See if the field is editable for the requested record
        if (columnHeader && !columnHeader.getEditor(record)) {
            return false;
        }
        
        ed = me.getEditor(record, columnHeader);
        if (ed) {
            me.context = context;
            me.setActiveEditor(ed);
            me.setActiveRecord(record);
            me.setActiveColumn(columnHeader);

            // Defer, so we have some time between view scroll to sync up the editor
            me.editTask.delay(15, ed.startEdit, ed, [me.getCell(record, columnHeader), value]);
        } else {
            // BrowserBug: WebKit & IE refuse to focus the element, rather
            // it will focus it and then immediately focus the body. This
            // temporary hack works for Webkit and IE6. IE7 and 8 are still
            // broken
            me.grid.getView().getEl(columnHeader).focus((Ext.isWebKit || Ext.isIE) ? 10 : false);
        }
    },
    onEditComplete : function(ed, value, startValue) {
        var me = this,
            grid = me.grid,
            sm = grid.getSelectionModel(),
            activeColumn = me.getActiveColumn();
            //dataIndex; // REMOVED

        if (activeColumn) {
            //dataIndex = activeColumn.dataIndex; // REMOVED

            me.setActiveEditor(null);
            me.setActiveColumn(null);
            me.setActiveRecord(null);
            delete sm.wasEditing;
    
            if (!me.validateEdit()) {
                return;
            }
            // Only update the record if the new value is different than the
            // startValue, when the view refreshes its el will gain focus
            if (value !== startValue) {
                
                // MODIFICATION  -  MODIFICATION  -  MODIFICATION  -  MODIFICATION
                activeColumn.setter( me.context.record, value );
                // END END END END END END END END END END END END END END END END 
                
            // Restore focus back to the view's element.
            } else {
                grid.getView().getEl(activeColumn).focus();
            }
            me.context.value = value;
            me.fireEvent('edit', me, me.context);
        }
    },
});