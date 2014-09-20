////
//// ContactTag
////
//// This model is the interface to the nextsteps_contact_tag table.


(function () {
    var AD = require('AppDev');
    
    // On Titanium and NodeJS, the full model definition is needed
    var extendedDefinition = typeof Titanium !== 'undefined' || typeof process !== 'undefined';
    
    var attr = {
        // Shared model attributes
        _adModule: 'nextSteps',
        _adModel: 'ContactTag',
        id: 'contacttag_uuid',
        hasUuid: true,
        labelKey: 'tag_label',
        _isMultilingual: false,
        //connectionType: 'server', // optional field
        cache: true,
        
        attributes: {
        }
    };
    
    if (extendedDefinition) {
        // Extended model attributes
        AD.jQuery.extend(attr, {
            type: 'single',  // 'single' | 'multilingual'
            dbTable: 'nextsteps_contact_tag',
            modelFields: {
                  contacttag_uuid:'varchar(36)',
                  contact_uuid:'varchar(36)',
                  tag_uuid:'varchar(36)'
            },
            lookupLabels: {
                tag_label: {
                    tableName: 'nextsteps_tag_trans',
                    foreignKey: 'tag_uuid',
                    referencedKey: 'tag_uuid',
                    label: 'tag_label'
                }
            },
            primaryKey: 'contacttag_uuid'
        });
    }
    
    
    var Model = AD.Model.extend('nextSteps.ContactTag',
    attr,
    {
        // define instance methods here.
    });
    
    if (module && module.exports) {
        // This is a CommonJS module, so return the model
        module.exports = Model;
    }
})();
