
Ext.onReady(function() {
    grid = Ext.create('Ext.grid.Panel', {
        title: 'Column Auto Width Example',
        store: 'examplestore',
        columns: [
            { header: 'A',               dataIndex: 'shorty',  width: 150,  autoWidth: true, editor: { xtype: 'textfield' } },
            { header: 'A wider header',  dataIndex: 'shorty',  width: 150, autoWidth: true, editor: { xtype: 'textfield' } },
            { header: 'B',               dataIndex: 'medium',  width: 150, autoWidth: true, editor: { xtype: 'textfield' } },
            { header: 'B wider header',  dataIndex: 'medium',  width: 150, autoWidth: true, editor: { xtype: 'textfield' } },
            { header: 'C',               dataIndex: 'longish', width: 150, autoWidth: true, editor: { xtype: 'textfield' } },
            { header: 'C wider header',  dataIndex: 'longish', width: 150, autoWidth: true, editor: { xtype: 'textfield' } },
            
        ],
        height: 200,
        width: 700,
        renderTo: Ext.getBody(),
        plugins: [
            Ext.create('Ext.grid.plugin.CellEditing', { clicksToEdit: 1 }),
            Ext.create('Ext.ux.ColumnAutoWidthPlugin', {}),
        ],
    });
    
});