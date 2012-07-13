
Ext.onReady(function() {
            
    grid = Ext.create('Ext.grid.Panel', {
        title: 'Column Setter/Getter example',
        store: 'examplestore',
        columns: [
            
            // Alls oldies is goldies:
            { header: 'Basic dataIndex',  dataIndex: 'string' , width: 150, editor: { xtype: 'textfield' } },
            
            // JsonPath: totally seamless :)
            // Handles read/write with difference detection and proper change events
            { header: 'JsonPath dataIndex',  dataIndex: 'complex.A', width: 150, editor: { xtype: 'textfield' } },
            
            // Roll your own getter / setter
            // This is the simplest way to access complex values without JsonPath ( which some might consider evil )
            {
                header: 'Complex data',
                // no dataIndex here
                getter: function(record){
                    var obj = record.get('complex');
                    return Ext.isObject( obj )  ? obj.B : '';
                },
                setter: function(record, value){ // only necessary if this is an editor grid
                    var obj = record.get('complex');
                    obj = Ext.apply({},obj); // hack for change detection
                    obj.B = value;
                    record.set('complex', obj ); // simplified way
                },
                
                // Change detection. Used by shouldUpdateCell:
                dataIndex: 'complex',
                
                width: 150,
                editor: { xtype: 'textfield' }
            },
            
            // Now we're having some fun... now you can actually set/get nested records:
            {
                header: 'Nested hasMany Record',
                // no dataIndex here
                getter: function(record){
                    var childrec = this.locateChildRecord( record, 'Color' );
                    return childrec ? childrec.get('value') : '';
                },
                
                // May have trouble saving this...
                // See: http://www.sencha.com/forum/showthread.php?130135-model.save()-too-shallow&p=731329#post731329
                setter: function(record, value){ // only necessary if this is an editor grid
                    var childrec = this.locateChildRecord( record, 'Color' );
                    if ( childrec ){
                        childrec.set('value', value );
                        record.afterEdit(); // Hack, in lieu of deepEquals
                    }
                },
                // utility function just for this column
                locateChildRecord: function( parentRec, name ){
                    if (! (parentRec && parentRec.nested)) return;
                    
                    return parentRec.nested().queryBy(function(rec){
                        return rec.get('name') == name
                    }).first();
                },
                
                // Change detection. Used by shouldUpdateCell.
                shouldUpdate: function(){ return true }, // Inefficient hack. Need to add record information to shouldUpdateCell
                
                width: 150,
                editor: { xtype: 'textfield' }
                
            }
            
        ],
        height: 200,
        width: 620,
        renderTo: Ext.getBody(),
        plugins: [
            Ext.create('Ext.grid.plugin.CellEditing', {
                clicksToEdit: 1
            })
        ],
    });
    
});