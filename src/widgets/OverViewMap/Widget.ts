import BaseWidget = require('core/BaseWidget.class');

import Overview = require('esri/dijit/OverviewMap');

export = OverViewMap;

class OverViewMap extends BaseWidget {
  overviewMap: Overview;

  startup() {

    this.initOverViewMap();
    this.ready();
  }

  initOverViewMap() {
    this.overviewMap = new Overview({
      map: this.AppX.runtimeConfig.map,
      attachTo: "bottom-right",
      opacity: .40
    });

    this.overviewMap.startup();

  }
}