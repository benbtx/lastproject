import BaseWidget = require('core/BaseWidget.class');
import Map = require("esri/map");

export = AutoRunAdaptor;

/**
* Description:让指定模块自动运行的适配器
* @class 
*/
class AutoRunAdaptor extends BaseWidget {
    private fieldConfigAll: Array<any> = null;
    constructor(settings) {
        super(settings)
        this.ready();
    }

    startup() {
        this.init();
    }
    /**
    * (方法说明)初始化
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private init() {
        //加载预加载的面板模块
        if (AppX.runtimeConfig.SideMenu) {
            var autoRunWidgets = [];
            AppX.appConfig.menuBarWidgets.forEach(function (item, index) {
                if (item.data) {
                    item.data.forEach(function (item, index) {
                        if (item.autorun)
                            autoRunWidgets.push(item)
                    })
                }
            })
            if (AppX.runtimeConfig.SideMenu.loadWidgets)
                AppX.runtimeConfig.SideMenu.loadWidgets(autoRunWidgets);
        }
    }
}