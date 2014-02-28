var $ = require('jquery');
var AD = require('AppDev');

$.Class('AppDev.Transactions', {
    defaults: {
        fileName: 'Transactions.json',
        syncedModels: []
    },
    operations: [{
        name: 'create',
        event: 'created'
    }, {
        name: 'update',
        event: 'updated'
    }, {
        name: 'destroy',
        event: 'destroyed'
    }]
}, {
    init: function(options) {
        var _this = this;
        
        // Initialize the transactions file store
        this.transactionStore = new AD.FileStore({
            fileName: this.options.fileName,
            defaultData: []
        });
        this.transactions = this.transactionStore.getData();
        
        this.options.syncedModels.forEach(function(modelName) {
            // Listen for updates to the model and record all the transactions
            var Model = AD.Models[modelName];
            _this.constructor.operations.forEach(function(operation) {
                Model.bind(operation.event, function(event, model) {
                    _this.transactions.push({
                        model: modelName,
                        operation: operation.name,
                        params: model.attrs()
                    });
                    _this.save();
                });
            });
        });
    },
    
    // Return the list of recorded transactions
    get: function() {
        return this.transactions;
    },
    
    // Reset the list of recorded transactions
    clear: function() {
        this.transactions = [];
        this.transactionStore.setData(this.transactions);
        this.save();
    },
    
    // Save the transactions to the persistent file store
    save: function() {
        this.transactionStore.flush();
    },
    
    // Apply an array of transactions to the database
    apply: function (transactions) {
        transactions.forEach(function(transaction) {
            var Model = AD.Models[transaction.model],
            model;
            if (transaction.operation === 'create') {
                model = new Model(transaction.params);
                model.save();
            }
            else if (transaction.operation === 'update') {
                model = Model.cache.getById(transaction.params[Model.primaryKey]);
                model.attrs(transaction.params);
                model.save();
            }
            else if (transaction.operation === 'destroy') {
                model = Model.cache.getById(transaction.params[Model.primaryKey]);
                model.destroy();
            }
        });
    }
});
