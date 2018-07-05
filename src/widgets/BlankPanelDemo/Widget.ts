import BaseWidget = require('core/BaseWidget.class');



import BlankPanel = require('widgets/BlankPanel/Widget');

export = BlankPanelDemo;

class BlankPanelDemo extends BaseWidget {
    baseClass = "blank-panel-demo";
    blankPanels: { [key: string]: BlankPanel } = {};

    startup() {
        this.setHtml(_.template(this.template)({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));

        this.bindEvents();
    }

    bindEvents() {
        this.domObj.on('click', '.create1', function () {
            this.showBlankPanel("test1");
        }.bind(this));

        this.domObj.on('click', '.destroy1', function () {
            this.closeBlankPanel("test1");
        }.bind(this));

        this.domObj.on('click', '.create2', function () {
            this.showBlankPanel("test2");
        }.bind(this));

        this.domObj.on('click', '.destroy2', function () {
            this.closeBlankPanel("test2");
        }.bind(this));
    }

    showBlankPanel(id?: string) {
        id = id || "helloman";
        // 使用方法如下

        // 测试在 【SCADA监控】->【SCADA报警】中的第一个按钮

        /**
        * 创建一个空面板
        * @method BlankPanel
        * @param    id:        string  用于唯一确定一个 Panel 方便添加事件以及交互
        * @param    title:     string  面板的标题 
        * @param    html:      string  将显示在面板中的 html
        * @param    width?:    number  （可选）设定面板宽度
        * @param    height?:   number  （可选）设定面板高度
        * @param    readyCallback?:   Function  （可选）面板加载完成后的回掉函数
        * @return   Object  为当前的对象，可调用其 destroy 方法将其销毁
        */
        if (this.blankPanels[id] === undefined || this.blankPanels[id].isDestroyed === true) {
            this.blankPanels[id] = new BlankPanel({
                id: id,
                title: id,
                html: "<div style='width:1000px;height:600px;background-color:#CCC;'><h1>" + id + "</h1></div>",
                width: 600,
                height: 337.5,
                readyCallback: this.onBlankPanelReady.bind(this, id)
            });
        } else {
            this.AppX.runtimeConfig.toast.Show("BlankPanel " + id + " 已存在！");
        }
    }

    // 销毁指定图表面板
    closeBlankPanel(id) {
        console.log("销毁面板 " + id);
        this.blankPanels[id].Destroy();
    }

    // 销毁所有图表面板
    closeAllBlankPanel() {
        console.log("销毁所有面板");
        for (var id in this.blankPanels) {
            if (this.blankPanels[id] !== undefined) {
                if (this.blankPanels[id].isDestroyed === false) {
                    this.blankPanels[id].Destroy();
                }
                // 置空引用释放内存
                this.blankPanels[id] = null;
                // 删除此键
                delete this.blankPanels[id];
            }
        }
    }

    // BlankPanel 初始化完成后调用
    onBlankPanelReady(id: string) {
        console.log('BlankPanel ' + id + ' 已经准备好！');
    }

    destroy() {
        this.domObj.remove();

        // 销毁所有已创建的图表面板
        this.closeAllBlankPanel();

        this.afterDestroy();
    }
}