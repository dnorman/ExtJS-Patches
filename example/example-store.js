
var sampledata = {
    records: [{
        id: 1,
        string: "Basic value One",
        complex: { A: 'Alpha', B: 'Beta', C: 'Gamma' },
        nested: [
            { id: 1, name: 'Color',  value: 'Blurple' },
            { id: 2, name: 'Size',   value: 'Extra medium' },
            { id: 3, name: 'Fabric', value: 'Kevlon'  }
        ]
    },{
        id: 2,
        string: "Basic value Two",
        complex: { A: 'Albert', B: 'BamBam', C: 'Charlie' },
        nested: [
            { id: 1, name: 'Color',  value: 'PinkyWinky' },
            { id: 2, name: 'Size',   value: 'Teeny Tiny' },
            { id: 3, name: 'Fabric', value: 'Lycrotton'  }
        ]
    },{
        id: 3,
        string: "Basic value Three",
        complex: { A: 'Android', B: 'Budweiser', C: 'Cthulhu' },
        nested: [
            { id: 1, name: 'Color',  value: 'Grellow' },
            { id: 2, name: 'Size',   value: '100XL' },
            { id: 3, name: 'Fabric', value: 'Nylester'  }
        ]
    }]
};

Ext.define('NestedRecord', {
    extend: 'Ext.data.Model',
    fields: ['id', 'name', 'value'],
});

Ext.define('ExampleRecord', {
    extend: 'Ext.data.Model',
    fields: ['id', 'string', 'complex'],
    associations: [{
        name: 'nested',
        type: 'hasMany',
        model: 'NestedRecord',
        associationKey: 'nested',
        reader: 'json',
    }]
});
Ext.create('Ext.data.Store', {
    storeId: 'examplestore',
    autoLoad: true,
    model: 'ExampleRecord',
    data : sampledata,
    proxy: {
        type: 'memory',
        reader: {
            type: 'json',
            root: 'records'
        }
    }
});