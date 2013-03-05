////
//// Year
////
//// This model is the interface to the nextsteps_year_data table.


(function () {
    // Pull AppDev from the global scope on NodeJS and browser and load the AppDev CommonJS module on Titanium
    var AD = AD || (global && global.AD) || require('AppDev');
    
    // On Titanium and NodeJS, the full model definition is needed
    var extendedDefinition = typeof Titanium !== 'undefined' || typeof process !== 'undefined';
    
    var attr = {
        // Shared model attributes
        _adModule:'nextSteps',
        _adModel:'Year',
        id:'year_id',
        labelKey:'year_label',
        _isMultilingual:true,
        //connectionType:'server', // optional field
        cache:true
    };
    
    if (extendedDefinition) {
        // Extended model attributes
        AD.jQuery.extend(attr, {
            type:'multilingual',  // 'single' | 'multilingual'
            tables:{
                data:'nextsteps_year_data',
                trans:'nextsteps_year_trans'
            },
            fields: {
                data: {
                  year_id:"int(11) unsigned"

                },
                trans: {
                  trans_id:"int(11) unsigned",
                  year_id:"int(11)",
                  language_code:"varchar(25)",
                  year_label:"text"

                  
                }
            },
            primaryKey:'year_id',
            multilingualFields: ['year_label']
        });
    }
    
    
    var Model = AD.Model.extend("nextSteps.Year",
    attr,
    {
        // define instance methods here.
    });
    
    if (module && module.exports) {
        // This is a CommonJS module, so return the model
        module.exports = Model;
    }
})();