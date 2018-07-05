export function toJson(basemapType, privateConfig) {

    return (function (mapView) {

        var result = {
            "mapOptions": {
                "extent": mapView.extent.toJson(),
                "spatialReference": mapView.spatialReference.toJson(),
                "scale": mapView.getScale()
            },
            "operationalLayers": [],
            "exportOptions": {
                // "outputSize": [
                //     800,
                //     1100
                // ],
                // "dpi": 96
            },
            "layoutOptions": {
                "titleText": "My Print",
                "authorText": "Sam",
                "copyrightText": "My Company",

                "customTextElements": [],
                //     {
                //         company: "1212"
                //     },
                //      {
                //         leftbottom:"000-000"
                //     }
                // ],
                "scaleBarOptions": {
                    "metricUnit": "esriMeters ",
                    "metricLabel": "米",
                    "nonMetricUnit": "esriMiles",
                    "nonMetricLabel": "mi"
                },
                // "legendOptions": {
                //     "operationalLayers": [
                //         {
                //             "id": "layer0",
                //             "subLayerIds": [
                //                 0
                //             ]
                //         },
                //         {
                //             "id": "layer1",
                //             "subLayerIds": [
                //                 0
                //             ]
                //         },
                //         {
                //             "id": "layer3",
                //             "subLayerIds": [
                //                 0,
                //                 15,
                //                 14,
                //                 13,
                //                 12,
                //                 11,
                //                 10,
                //                 9,
                //                 8,
                //                 7,
                //                 6,
                //                 5,
                //                 4,
                //                 3,
                //                 2,
                //                 1
                //             ]
                //         }
                //     ]
                // }
            }
        }


        // var layers = mapView.getLayersVisibleAtScale(mapView.getScale());
        // layers.forEach(function (layer) {
        //     console.log(layer.id);

        //     var layerInfo = {
        //         "id": layer.id,
        //         "title": layer.name,
        //         "opacity": layer.opacity,
        //         "minScale": layer.minScale,
        //         "maxScale": layer.maxScale,
        //         "url": layer.url,
        //         "token": layer.token,

        //         "layers": []

        //     }
        //     //.subLayerIds
        //     if (layer.layerInfos && layer.layerInfos[0]) {
        //         var parentLayerId = -1;
        //         layerInfo.layers = [];

        //         layer.layerInfos.forEach(function (sublayer, i) {
        //             var currentSublayer = {
        //                 "id": sublayer.id,
        //                 "minScale": sublayer.minScale,
        //                 "maxScale": sublayer.maxScale,
        //                 "parentLayerId": parentLayerId,
        //                 "layerDefinition": {
        //                     "source": {
        //                         "mapLayerId": sublayer.id,
        //                         "type": "mapLayer"
        //                     }
        //                 },
        //                 "subLayerIds": null,
        //                 "name": sublayer.name,
        //                 "defaultVisibility": sublayer.visible
        //             }
        //             if (sublayer.subLayerIds) {
        //                 currentSublayer.subLayerIds = [];
        //                 sublayer.subLayerIds.forEach(function (sub) {

        //                     currentSublayer.subLayerIds.push(sub);
        //                 });

        //             }
        //             parentLayerId = 0;
        //             layerInfo.layers.push(currentSublayer);

        //         });
        //     }


        //     result.operationalLayers.push(layerInfo);



        // });




        var layersid = mapView.layerIds;
        layersid.forEach(function (layerid) {
            // console.log(layer.id);
            var layer = mapView.getLayer(layerid);
            var isBeijing = false;
            if (layer.url && /BEIJING/.test(layer.url))
                isBeijing = true;
            var index = -1;
            if (privateConfig.length > 0)
                index = _.findIndex(privateConfig, function (o: any) { return o.url == layer.url });
            if (basemapType == '0' && mapView.getScale() >= 2000 && index != -1)//保证地图比例尺小于1/2000，但打印比例尺大于1/2000是打印矢量地形
            {
                var layerInfo = {
                    "id": layer.id,
                    "title": layer.name,
                    "opacity": layer.opacity,
                    "minScale": layer.minScale,
                    "maxScale": layer.maxScale,
                    "url": layer.url,
                    "token": layer.token,

                    "layers": []

                }
                //.subLayerIds
                if (layer.layerInfos && layer.layerInfos[0]) {
                    var parentLayerId = -1;
                    layerInfo.layers = [];

                    // if (layer.visible) {
                    layer.layerInfos.forEach(function (sublayer, i) {
                        var currentSublayer = {
                            "id": sublayer.id,
                            "minScale": sublayer.minScale,
                            "maxScale": sublayer.maxScale,
                            "parentLayerId": parentLayerId,
                            "layerDefinition": {
                                "source": {
                                    "mapLayerId": sublayer.id,
                                    "type": "mapLayer"
                                }
                            },
                            "subLayerIds": null,
                            "name": sublayer.name,
                            "defaultVisibility": sublayer.visible
                        }
                        if (sublayer.subLayerIds) {
                            currentSublayer.subLayerIds = [];
                            sublayer.subLayerIds.forEach(function (sub) {

                                currentSublayer.subLayerIds.push(sub);
                            });

                        }
                        parentLayerId = 0;
                        layerInfo.layers.push(currentSublayer);

                    });
                    // }
                }
                result.operationalLayers.push(layerInfo);
            }
            else if (layer.visible && !isBeijing) {
                var layerInfo = {
                    "id": layer.id,
                    "title": layer.name,
                    "opacity": layer.opacity,
                    "minScale": layer.minScale,
                    "maxScale": layer.maxScale,
                    "url": layer.url,
                    "token": layer.token,

                    "layers": []

                }
                //.subLayerIds
                if (layer.layerInfos && layer.layerInfos[0]) {
                    var parentLayerId = -1;
                    layerInfo.layers = [];

                    // if (layer.visible) {
                    layer.layerInfos.forEach(function (sublayer, i) {
                        var currentSublayer = {
                            "id": sublayer.id,
                            "minScale": sublayer.minScale,
                            "maxScale": sublayer.maxScale,
                            "parentLayerId": parentLayerId,
                            "layerDefinition": {
                                "source": {
                                    "mapLayerId": sublayer.id,
                                    "type": "mapLayer"
                                }
                            },
                            "subLayerIds": null,
                            "name": sublayer.name,
                            "defaultVisibility": sublayer.visible
                        }
                        if (sublayer.subLayerIds) {
                            currentSublayer.subLayerIds = [];
                            sublayer.subLayerIds.forEach(function (sub) {

                                currentSublayer.subLayerIds.push(sub);
                            });

                        }
                        parentLayerId = 0;
                        layerInfo.layers.push(currentSublayer);

                    });
                    // }
                }
                result.operationalLayers.push(layerInfo);
            }
        });


        // mapView.allLayerViews.forEach(function (items) {
        //     var layer = items.layer;

        //     var layerInfo = {
        //         "id": layer.id,
        //         "title": layer.title,
        //         "opacity": layer.opacity,
        //         "minScale": layer.minScale,
        //         "maxScale": layer.maxScale,
        //         "url": layer.url,
        //         "token": layer.token,

        //         "layers": []

        //     }

        //     if (layer.allSublayers) {
        //         var parentLayerId = -1;
        //         layerInfo.layers = [];
        //         layer.allSublayers.forEach(function (sublayer) {
        //             var currentSublayer = {
        //                 "id": sublayer.id,
        //                 "minScale": sublayer.minScale,
        //                 "maxScale": sublayer.maxScale,
        //                 "parentLayerId": parentLayerId,
        //                 "layerDefinition": {
        //                     "source": {
        //                         "mapLayerId": sublayer.id,
        //                         "type": "mapLayer"
        //                     }
        //                 },
        //                 "subLayerIds": null,
        //                 "name": sublayer.title,
        //                 "defaultVisibility": sublayer.visible
        //             }

        //             if (sublayer.sublayers) {
        //                 currentSublayer.subLayerIds = [];
        //                 sublayer.sublayers.forEach(function (sub) {
        //                     currentSublayer.subLayerIds.push(sub.id);
        //                 });
        //             }

        //             parentLayerId = 0;
        //             layerInfo.layers.push(currentSublayer);
        //         });
        //     }


        //     result.operationalLayers.push(layerInfo);

        // });



        //    console.log(JSON.stringify(result));
        return result;


    })(AppX.runtimeConfig.map)


}


