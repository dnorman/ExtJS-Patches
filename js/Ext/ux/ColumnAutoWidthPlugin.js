(function(){
    
var squishCls = Ext.id(null,'colAutoWidth');
    
Ext.util.CSS.createStyleSheet([
    'table.' + squishCls + '{ table-layout: auto !important; width: auto !important; }', 
    'table.' + squishCls + ' .x-grid-header-row th { width: auto !important; }',
    'table.' + squishCls + ' .x-grid-cell { width: auto !important; }',
    '.x-grid-header-ct.' + squishCls + ' .x-column-header { width: auto !important; }'
].join(''), squishCls );

Ext.define('Ext.ux.ColumnAutoWidthPlugin', {
    alias: 'plugin.ux.columnautowidth',
    extend: 'Ext.AbstractPlugin',
    mixins: {observable: 'Ext.util.Observable'},
    autoUpdate: true,
    allColumns: false,
    constructor: function(config) {
        var me = this;
        Ext.apply(me, config);
        
        me.viewChangeDT = new Ext.util.DelayedTask(function(){ me.refresh() });
        me.addEvents('beforecolumnresize', 'columnresize');
        me.mixins.observable.constructor.call(me);
        
    },
    init: function(grid) {
        var me = this;
        me.disable();
        me.grid = grid;
        grid.columnAutoWidthPlugin = me;
        me.enable();
    },
    destroy: function() {
        this.clearListeners();
    },
    enable: function() {
        var me = this,  grid = me.grid;
        
        if (me.autoUpdate && me.disabled && grid){
            var view = grid.getView();
            
            me.mon(view, 'refresh',         me.onViewChange, me );
            me.mon(view, 'itemadd',         me.onViewChange, me );
            me.mon(view, 'itemremove',      me.onViewChange, me );
            me.mon(view, 'itemupdate',      me.onViewChange, me );
            me.mon(view, 'afteritemexpand', me.onViewChange, me );
            
            me.mon(grid, 'columnshow', me.onColumnChange, me);//, { buffer: 100 });
        }
        
        me.callParent();
    },
    disable: function() {
       this.clearManagedListeners();
       this.callParent();
    },
    suspend: function(){
	this.suspendAutoSize = true;
    },
    resume: function(refresh){
        this.suspendAutoSize = false;
        if ( refresh ) this.viewChangeDT.delay(300);
    },
    onColumnChange: function(ct, column) {
        if( this.suspendAutoSize ) return;
        console.log('ColumnAutoWidthPlugin','onColumnChange');
        if ( column.autoWidth ) this.doAutoSize([column]); 
    },
    onViewChange: function() {
        this.viewChangeDT.delay(300);
    },
    refresh: function() {
        var me = this, grid = me.grid;
        if ( me.suspendAutoSize || !grid.rendered || !grid.getView().rendered ) return;
        
        if( grid.view.isExpandingOrCollapsing ){ 
            me.viewChangeDT.delay(300);
            return;
        }
        
        var cols = me.getAutoCols();
        if ( cols.length ) me.doAutoSize( cols );
    },
    getAutoCols: function(){
        var me = this, cols = me.grid.columns, out = [], i = cols.length, col;
        
        while(i--){
            col = cols[i];
            if ( me.allColumns || col.autoWidth ) out.push(col);
        }
        
        return out;
    },
    getTableResizers: function() {
        var els = this.grid.getView().getEl().query( '.' + Ext.baseCSSPrefix + 'grid-table-resizer');
    
        // Grouping feature - first table wraps everything and can be ignored
        if (els.length > 1 && Ext.fly(els[0]).contains(els[1])) {
            els.shift();
        }
    
        return els;
    },
    getColumnResizers: function(column, config) {
        // Grab the <th> rows (one per table) that are used to size the columns
        var els = this.grid.getEl().query( '.' + Ext.baseCSSPrefix + 'grid-col-resizer-' + column.id);
 
        // Grouping feature - first table wraps everything and needs to be ignored
        if (els.length > 1 && Ext.fly(els[0]).parent('table').contains(els[1])) {
            els.shift();
        }
 
        return els;
    },
    getHeaderWidth: function(column){
        //var el = this.grid.el.down( '#' + column.id + ' .' + Ext.baseCSSPrefix + 'column-header-inner' );
        if(column.el){
            return column.el.getTextWidth() + column.el.getFrameWidth('lr');
        }
        
        return 0;
    },
    doAutoSize: function( resizeCols ){
        var me = this,
            view = me.grid.getView();
            
        if( me.suspendAutoSize ) return;
        
        var start = new Date().getTime();
        var restoreScroll = me.grid.getEl().cacheScrollValues();
        
        Ext.batchLayouts(function(){
            
            me.grid.headerCt.el.addCls( squishCls );
            var tableResizers = me.getTableResizers()
            // set the table resizers to auto
            Ext.each( tableResizers , function(el) {
                el = Ext.fly(el).addCls( squishCls );
            });
            // console.log('ColumnAutoWidthPlugin','autofy table resizers took', 0-start + (start = new Date().getTime()), 'ms');
            
            // no further dom changes beyond this point - to avoid reflows
            
            // console.log('ColumnAutoWidthPlugin','autofy column resizers took', 0-start + (start = new Date().getTime()), 'ms');
            
            Ext.each(resizeCols, function(col){
                var els = me.getColumnResizers(col), newWidth = 0;
                
                if( col.el ) newWidth = Ext.num(col.el.dom.scrollWidth,0);
                
                Ext.each(els, function(el) {
                    newWidth = Math.max(el.scrollWidth, newWidth); // scrollwidth should be cheaper
                });
                
                newWidth = Math.max( newWidth , col.minAutoWidth || 0 );
                if( col.maxAutoWidth ) newWidth = Math.min(col.maxAutoWidth, newWidth );
                
                if( newWidth == col.width ){
                    //
                } else if( col.el ){
                    col.setWidth( newWidth );
                } else {
                    col.width = newWidth;
                }
            });
            
            // console.log('ColumnAutoWidthPlugin','measure and set took', 0-start + (start = new Date().getTime()), 'ms');
            
            // put the table resizers back how you found them
            
            me.grid.headerCt.el.removeCls( squishCls );
            Ext.each( tableResizers , function(el) {
                el = Ext.fly(el).removeCls( squishCls );
            });
            //console.log('ColumnAutoWidthPlugin','restore table layout took', 0-start + (start = new Date().getTime()), 'ms');
        });
        
        restoreScroll();
        console.log('ColumnAutoWidthPlugin','doAutoSize took', 0-start + (start = new Date().getTime()), 'ms');
        
    }
    
});

})();