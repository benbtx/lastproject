import BaseWidget = require('core/BaseWidget.class');

export = LoadWait;

class LoadWait extends BaseWidget {
    baseClass = "widget-loadwait";

    startup() {
        this.AppX.runtimeConfig.loadWait = new loadWait(this.template);
        this.ready();
    }
}

class loadWait {
    template:string;
    domObj: JQuery;

    constructor(template:string) {
        this.template=template;
    }

    /**
     * @function 显示
     * @param message 进度消息
     * @param domObj 父对象
     */
    Show(message?: string,domObj?:any) {
        this.domObj=domObj;
        var lbgobj=domObj.find(".widget-loadwait");
        if(lbgobj.length==0){
            domObj.append(this.template);
            lbgobj=domObj.find(".widget-loadwait");
        }
        else
            lbgobj.show();      

        if (message !== undefined)
            domObj.find('.tipspan').text(message);
        else {
            domObj.find('.tipspan').text("正在查询中，请耐心等待...");
        }        
    }

    /**
     * @function 隐藏
     */
    Hide() {
        var lbgobj=this.domObj.find(".widget-loadwait");
        if(lbgobj.length>0){
            lbgobj.hide();
        }
    }
}