////
//// Group
////
//// This model is the interface to the nextsteps_group table.


(function () {
    // Pull AppDev from the global scope on NodeJS and browser and load the AppDev CommonJS module on Titanium
    var AD = AD || (global && global.AD) || require('AppDev');
    
    // On Titanium and NodeJS, the full model definition is needed
    var extendedDefinition = typeof Titanium !== 'undefined' || typeof process !== 'undefined';
    
    var attr = {
        // Shared model attributes
        _adModule:'nextSteps',
        _adModel:'Group',
        id:'group_uuid',
        hasUuid:true,
        labelKey:'group_name',
        _isMultilingual:false,
        //connectionType:'server', // optional field
        cache:true,
        
        attributes: {
            user_id: 'integer',
            group_filter: 'JSON'
        }
    };
    
    if (extendedDefinition) {
        // Extended model attributes
        AD.jQuery.extend(attr, {
            type:'single',  // 'single' | 'multilingual'
            dbTable:'nextsteps_group',
            modelFields: {
                  group_uuid:"varchar(36)",
                  user_id:"int(11) unsigned",
                  group_name:"text",
                  group_filter:"text"

            },
            primaryKey:'group_uuid'
        });
    }
    
    
    var Model = AD.Model.extend("nextSteps.Group",
    attr,
    {
        // define instance methods here.
    });
    
    if (module && module.exports) {
        // This is a CommonJS module, so return the model
        module.exports = Model;
    }
})();
