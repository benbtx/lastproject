import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
// import MenuBar = require('Widget/MenuBar/Widget');


/*** 暴露类 ***/
export = AttributeAnnotationTool;

class AttributeAnnotationTool extends BaseWidget {
    baseClass = "widget-layerlisttool";
    
    startup() {
        this.setHtml(this.template);
        this.initEvent();
        this.ready();
    }

    initEvent() {
        //click，点击生成
        this.domObj.on("click", () => {
            //生产属性标注
            $(".fire-on[data-id=" + this.config.widgetname + "]").first().trigger("click");
        });
    }
}