var AD = require('AppDev');
var $ = require('jquery');
var controller = require('app/controller');

// Create a stats container, complete with a header label and footer view
var StatsView = $.View('AppDev.UI.StatsView', {}, {
    init: function(options) {
        this.hasFooter = typeof this.options.footerHeight !== 'undefined';
        this.footerHeight = this.options.footerHeight || 0;
        
        // Create the stats containing view
        var statsView = Ti.UI.createView({
            width: AD.UI.screenWidth
        });
        
        // The stats view is the view's view
        this._super({view: statsView});
        
        this.smartBind(AD.Models.Step, '*', $.throttle(this.update));
        this.smartBind(AD.Models.ContactStep, '*', $.throttle(this.refreshStats));
    },
    
    // Create the child views
    create: function() {
        // Create the header label
        this.add('headerLabel', Ti.UI.createLabel({
            left: AD.UI.padding,
            top: AD.UI.padding,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE,
            text: '',
            font: AD.UI.Fonts.header
        }));
        
        // Create the stats container
        this.$statsTable = this.add('statsTable', new StatsTable({
            $window: this
        }));
        
        if (this.hasFooter) {
            // Create the abstract footer view
            this.add('footerView', Ti.UI.createView({
                left: 0,
                bottom: AD.UI.padding,
                width: AD.UI.screenWidth,
                height: this.footerHeight
            }));
        }
    },
    
    // Initialize the child views
    initialize: function() {
        this.update();
    },
    
    // Update the entire stats view UI
    update: function() {
        var startDateString = AD.PropertyStore.get(this.options.lastUpdatePropertyName);
        var startDate = startDateString ? new Date(parseInt(startDateString, 10)) : null;
        var headerText = startDate ? $.formatString('statsHeaderSince', $.formatDate(startDate)) : AD.Localize('statsHeaderEver');
        var headerHeight = startDate ? 60 : 30;
        this.getChild('headerLabel').text = headerText;
        
        var statsTable = this.$statsTable.table;
        statsTable.top = headerHeight + AD.UI.padding;
        statsTable.bottom = this.footerHeight + AD.UI.padding * 2;
        
        this.refreshStats();
    },
    
    // Refresh the stats values
    refreshStats: function() {
        this.$statsTable.refreshStats();
    }
});

// Create a ModelTable subclass that represents the stats table
var StatsTable = $.ModelTable('AppDev.UI.StatsTable', {
    sortFields: [{field: 'campus_label', label: 'campus'}],
    
    rowHeight: 40,
    font: AD.UI.Fonts.mediumSmall
}, {
    init: function(options) {
        this._super({
            $window: this.options.$window,
            Model: AD.Models.Step,
            grouped: true,
            sorted: true,
            sortOrder: ['campus_label']
        });
        
        this.refreshStats();
    },
    
    // Create and return a table view row that represents the contact
    createRow: function(step) {
        // Create a table view row that represents this step
        var $statRow = $.View.create(Ti.UI.createTableViewRow({
            height: this.constructor.rowHeight
        }));
        
        var font = this.constructor.font;
        $statRow.add('index', Ti.UI.createLabel({
            left: AD.UI.padding,
            text: null,
            font: font
        }));
        $statRow.add('label', Ti.UI.createLabel({
            left: 40,
            right: 40,
            text: step.getLabel(),
            font: font
        }));
        $statRow.add('stat', Ti.UI.createLabel({
            right: AD.UI.padding,
            text: null,
            font: font
        }));
        
        return $statRow.getView();
    },
    
    // Refresh the stats values
    refreshStats: function(startDate, endDate) {
        $.each(this.modelRows, function(step_uuid, row) {
            var $statRow = row.get$View();
            $statRow.getChild('stat').text = AD.Models.Contact.getStepStats(step_uuid, startDate, endDate);
            $statRow.getChild('index').text = row.index + 1 + '.';
        });
    }
});

module.exports = $.Window('AppDev.UI.AppStatsWindow', {
    actions: [{
        title: 'reset',
        rightNavButton: true,
        callback: function() {
            AD.PropertyStore.remove(this.constructor.lastUpdatePropertyName);
            this.get$Child('statsView').update();
            this.getChild('viewTotals').visible = false;
        },
        enabled: AD.Defaults.development
    }],
    
    lastUpdatePropertyName: 'lastStatsReport' // a property in AD.PropertyStore
}, {
    init: function(options) {
        // Initialize the base $.Window object
        this._super({
            title: 'statsTitle'
        });
    },
    
    // Create the child views
    create: function() {
        var $statsView = this.add('statsView', new StatsView({
            footerHeight: AD.UI.buttonHeight,
            lastUpdatePropertyName: this.constructor.lastUpdatePropertyName
        }));
        
        var headerLabel = $statsView.getChild('headerLabel');
        var footerView = $statsView.getChild('footerView');
        
        // Create the view totals button
        var _this = this;
        var viewTotalsButton = this.record('viewTotals', Ti.UI.createButton({
            left: AD.UI.padding,
            top: 0,
            width: AD.UI.screenWidth / 2 - AD.UI.padding * 2,
            height: AD.UI.buttonHeight,
            titleid: 'viewTotals',
            visible: AD.PropertyStore.get(this.constructor.lastUpdatePropertyName) ? true : false
        }));
        viewTotalsButton.addEventListener('click', function(event) {
            _this.createWindow('ViewTotalsWindow');
        });
        footerView.add(viewTotalsButton);
        
        // Create the save button
        var saveButton = Ti.UI.createButton({
            right: AD.UI.padding,
            top: 0,
            width: AD.UI.screenWidth / 2 - AD.UI.padding * 2,
            height: AD.UI.buttonHeight,
            titleid: 'saveStats'
        });
        saveButton.addEventListener('click', this.proxy('save'));
        footerView.add(saveButton);
    },
    
    save: function() {
        var sendStatsReportEmail = Ti.App.Properties.getBool('send_stats_email_preference');
        AD.UI.yesNoAlert(sendStatsReportEmail ? 'statsConfirmSubmit' : 'statsConfirmSave').done(this.proxy(function() {
            var today = $.today();
            var yesterday = $.today();
            yesterday.setDate(today.getDate() - 1);
            var lastStatsReport = AD.PropertyStore.get(this.constructor.lastUpdatePropertyName);
            
            // Update the lastStatsReport property to the current date and the stats view to reflect the change
            AD.PropertyStore.set(this.constructor.lastUpdatePropertyName, today.getTime());
            this.get$Child('statsView').update();
            this.getChild('viewTotals').visible = true;
            
            controller.performPreSyncValidation();
            
            // Possibly send a stats report email to the address set in preferences
            if (sendStatsReportEmail) {
                var stats = AD.Models.Contact.getStats(lastStatsReport, yesterday);
                var steps = '';
                AD.Models.Step.cache.getArray(function(step) {
                    var line = step.getValue()+': '+stats[step.getId()];
                    steps += line+'\n';
                });
                var messageBody = $.formatString('statsMessageBody', Ti.Platform.username, $.formatDate(today), steps);
                console.log(messageBody);
                
                var address = Ti.App.Properties.getString('send_stats_email_address_preference');
                var emailDialog = Ti.UI.createEmailDialog({
                    toRecipients: [address],
                    subject: 'Stats Report from "'+Ti.Platform.username+'"',
                    messageBody: messageBody
                });
                emailDialog.open();
            }
        }));
    }
});

var ViewTotalsWindow = $.Window('AppDev.UI.ViewTotalsWindow', {}, {
    init: function(options) {
        // Initialize the base $.Window object
        this._super({
            title: 'viewTotalsTitle',
            autoOpen: true
        });
    },
    
    // Create the child views
    create: function() {
        // Create the scrollable stats container
        var $statsView = new StatsView({
            lastUpdatePropertyName: 'lastStatsReset' // a property in AD.PropertyStore
        });
        this.add('statsView', $statsView);
    }
});
