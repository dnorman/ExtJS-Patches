
Ext.onReady(function() {
            
    Ext.create('Ext.grid.Panel', {
        title: 'Column Setter/Getter example',
        store: 'examplestore',
        columns: [
            
            // Alls oldies is goldies:
            { header: 'Basic dataIndex',  dataIndex: 'string' , width: 150 },
            
            // JsonPath: totally seamless :)
            // Handles read/write with difference detection and proper change events
            { header: 'JsonPath dataIndex',  dataIndex: 'complex.A', width: 150 },
            
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
                    var obj = r.get('obj') || {};
                    r.set('complex', Ext.apply( obj ,{ B: value })); // simplified way
                },
                width: 150
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
                    if ( childrec ) childrec.set('value', value );
                },
                // utility function just for this column
                locateChildRecord: function( parentRec, name ){
                    if (! (parentRec && parentRec.nested)) return;
                    
                    return parentRec.nested().queryBy(function(rec){
                        return rec.get('name') == name
                    }).first();
                },
                width: 150
                
            }
            
        ],
        height: 200,
        width: 620,
        renderTo: Ext.getBody()
    });
    
});