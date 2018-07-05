import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');


export = MenuBar;

class MenuBar extends BaseWidget {
    baseClass = "widgets-menu-bar";
    panels: Array<any> = new Array();
    debug = false;
    // 此函数在系统初始化完成后会自动调用
    //  所有业务逻辑从此函数开始
    startup() {
        // 异步获取 config
        // 可以在此做权限控制
        // (function (that) {
        //     $.ajax("//test.com", function (data) {
        //         that.start.apply(that,data);
        //     });
        // })(this);

        this.start();
    }

    start(config?) {
        this.addToDom({
            root: this.widgetPath,
            menuListData: this.config.menuListData || this.AppX.appConfig.menuBarWidgets
        });
        // 初始化事件监听
        this.initDomListen();
        this.ready();
    }

    destroy() {

    }

    initDomListen() {
        this.domObj.delegate("li", "click", this.itemOnClick.bind(this));

        // 修改菜单打开方式为 mouseEnter
        this.domObj.delegate(".btn-group .btn-group", "mouseenter", function (event) {
            this.domObj.find('.btn-group .open').removeClass('open');
            $(event.currentTarget).addClass('open');
        }.bind(this));

        // 鼠标离开自动折叠
        this.domObj.delegate('.btn-group.open .dropdown-menu', 'mouseleave', function (e) {
            $(e.currentTarget).parent().removeClass('open');
        }.bind(this));

    }

    itemOnClick(data?) {
        var target = $(data.currentTarget);
        var panel = this.panels[target.data('id')];
        if (panel) {
            this.bug('模块[' + target.data('label') + ']正在使用当中!');
            if (panel.focus) {
                panel.focus();
            }
            return;
        }

        this.loadWidget(target);
    }

    loadWidget(target) {
        if (target.data('in-panel') === true) {
            require({}, [Functions.concatUrl(this.config.panelWidgetPath, this.config.panelWidgetMain)], (Panel) => {
                this.log('加载面板模块:' + target.data('widget'));
                // 新建一个panel用于存放widget
                this.panels[target.data('id')] = new Panel({
                    widgetPath: this.config.panelWidgetPath,
                    afterDestroyCallback: this.destroyWidget.bind(this, target.data('id'))
                }, {
                        panelTitle: target.data('label'),
                        panelUniqClassName: target.data('id'),
                        innerWidgetPath: target.data('widget'),
                        innerWidgetMain: target.data('main')
                    });
            });
        } else {

            require({}, [Functions.concatUrl(target.data('widget'), target.data('main'))], (Widget) => {
                this.log('加载模块:' + target.data('widget'));
                this.panels[target.data('id')] = new Widget({
                    widgetPath: target.data('widget'),
                    afterDestroyCallback: this.destroyWidget.bind(this, target.data('id'))
                });
            });
        }
    }

    destroyWidget(widgetID) {
        this.panels[widgetID] = null;
        this.log('已销毁对象:ID = ' + widgetID);
    }

    addToDom(data) {
        var htmlString = _.template(this.template)(data);
        this.setHtml(htmlString);
    }
}