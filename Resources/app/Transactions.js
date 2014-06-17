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
    }],
    
    instance: null,
    // Return the Transactions singleton instance
    getInstance: function() {
        return this.instance;
    },
    
    // Create the Transactions singleton instance
    initialize: function(options) {
        if (this.instance) {
            console.warn('The AD.Transactions singleton instance already exists! Creating another instance may lead to memory leaks and other unexpected behavior.');
        }
        this.instance = new AD.Transactions(options);
    },
}, {
    init: function(options) {
        var _this = this;
        
        // Initialize the transactions file store
        this.transactionStore = new AD.FileStore({
            fileName: this.options.fileName,
            defaultData: []
        });
        this.transactions = this.transactionStore.getData();
        
        this.active = true;
        
        this.options.syncedModels.forEach(function(modelName) {
            // Listen for updates to the model and record all the transactions
            var Model = AD.Models[modelName];
            _this.constructor.operations.forEach(function(operation) {
                Model.bind(operation.event, function(event, model) {
                    if (_this.active) {
                        _this.transactions.push({
                            model: modelName,
                            operation: operation.name,
                            params: model.attrs()
                        });
                        _this.save();
                    }
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
    
    // Stop recording transations
    pause: function() {
        this.active = false;
    },
    
    // Stop recording transations
    resume: function() {
        this.active = true;
    },
    
    // Apply an array of transactions to the database
    apply: function(transactions, progress) {
        AD.Database.DataStore.disableForeignKeys(AD.Defaults.dbName); // temporarily disable foreign-key checks
        
        var numTransactions = transactions.length;
        transactions.forEach(function(transaction, index) {
            progress(index, numTransactions);
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
        progress(numTransactions, numTransactions);
        
        AD.Database.DataStore.enableForeignKeys(AD.Defaults.dbName); // re-enable foreign-key checks
    }
});
