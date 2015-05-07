var Map = {
    voronoi: new Voronoi(),
    diagram: null,
    margin: 0.0,
    canvas: null,
    numberOfSites: 1000,
    zoneToContains: [],
    edgeZoneIds: [],
    colorByZone: [],
    edgeZoneObject: {},
    edgeCellObject: {},
    chanceOfWater: 70,
    renderOnlyPolticalBounds: false,
    bbox: {
        xl: 0,
        xr: 800,
        yt: 0,
        yb: 600
    },
    numberOfZones: 12,
    sites: [],
    consistency: 2,
    treemap: null,
    hoverColor: '#00ffff',

    generate: function() {
        // Guarantee starting state, since cells are re-used by the voronoi library.
        // and map object can be re-used via GUI.
        this.zoneToContains = [];
        this.edgeZoneIds = [];
        this.colorByZone = [];
        this.edgeZoneObject = {};
        this.edgeCellObject = {};
        this.renderOnlyPolticalBounds = false;
        this.sites = [];
        Voronoi.prototype.Cell.prototype.water=null;
        Voronoi.prototype.Cell.prototype.plate=null;

        if(this.diagram!= null && this.diagram.cells != null) {
            var cells = this.diagram.cells;
            for (i in this.diagram.cells) {
                var cell = cells[i];
                cell.water=null;
                cell.zone=null;
                var halfEdges = cell.halfedges;
                for(y in halfEdges) {
                    var halfEdge = halfEdges[y];
                    halfEdge.politicalBound = null;
                }
            }
        }

        this.canvas = document.getElementById('voronoiCanvas');
        this.randomSites(this.numberOfSites, true);
        for (var i = 0; i < this.consistency; i++) {
            this.relaxSites();
        }
        this.treemap = this.buildTreemap();
        this.assignZones();
        this.assignZonePoliticalColors();
        this.assignEdgeZones();
        this.assignWater();
        this.assignPoliticalEdges();
        this.renderPoliticalView();
    },

    saveImage: function() {
        var image = this.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  // here is the most important part because if you dont replace you will get a DOM 18 exception.
        window.location.href=image; // it will save locally
    },

    assignWater: function() {
        for( var zoneCounter = 0; zoneCounter < this.edgeZoneIds.length; zoneCounter++ ) {
            var waterRoll = this.randomIntegerInRange(0, 100);
            if(waterRoll < this.chanceOfWater)
            {
                var zoneId = this.edgeZoneIds[zoneCounter];
                var cellsInZone = this.zoneToContains[zoneId];
                for( var cellCounter =0; cellCounter < cellsInZone.length; cellCounter++ ) {
                    var cellId = cellsInZone[cellCounter];
                    var cell = this.getCellForId(cellId);
                    cell.water = true;
                }
            }
        }
    },

    assignPoliticalEdges: function() {
        var cells = this.diagram.cells;

        var compareZonesAndAssignPoliticalBounds = function( halfedge, cell, adjacentCell) {
            if(cell.zone != adjacentCell.zone && !(cell.water == true && adjacentCell.water == true)) {
                halfedge.politicalBound=true;
            }else {
                halfedge.politicalBound=false;
            }
        }

        for ( i in cells ) {
            var cell = cells[i];
            var cellId = cells[i].voronoiId;
            var halfEdges = cell.halfedges;

            for(var k=0; k < halfEdges.length; k++) {
                var lSite = halfEdges[k].edge.lSite;
                var rSite = halfEdges[k].edge.rSite;
                if(lSite != null && lSite.voronoiId != cellId) {
                    var adjacentCell = this.getCellForId(lSite.voronoiId);
                    compareZonesAndAssignPoliticalBounds(halfEdges[k], cell, adjacentCell);
                }

                if(rSite != null && rSite.voronoiId != cellId) {
                    var adjacentCell = this.getCellForId(rSite.voronoiId);
                    compareZonesAndAssignPoliticalBounds(halfEdges[k], cell, adjacentCell);
                }
            }
        }
    },

    assignEdgeZones: function() {
        var edgeCellIds = Object.keys(this.edgeCellObject);
        for( var i = 0; i < edgeCellIds.length; i++ ) {
            var cell = this.getCellForId(edgeCellIds[i]);

            this.edgeZoneObject[cell.zone] = 1;
        }
        this.edgeZoneIds = Object.keys(this.edgeZoneObject);
    },

    renderVoronoiView: function() {
        this.renderOnlyPolticalBounds = false;
        this.renderMapBorder();
        this.setCellColors('#ffffff', '#333', '#ff0000');
        this.renderAllCells();
    },

    assignZonePoliticalColors: function() {
        for(var zoneNumber = 0; zoneNumber < this.numberOfZones; zoneNumber++) {
            this.colorByZone[zoneNumber] = this.randomHexColor();
        }
    },

    renderZoneView: function() {
        this.renderMapBorder();
        this.setCellColors('#ffffff', '#333', '#ff0000');
        this.renderOnlyPolticalBounds = false;

        for(var cellId=0; cellId < this.getCellCount(); cellId++ ) {
            var cell = this.getCellForId( cellId );
            if( cell != null && cell.zone != null ) {
                cell.cellColor = this.colorByZone[cell.zone];
                cell.siteColor = this.colorByZone[cell.zone];
            }
        }
        this.renderAllCells();
    },
    renderGriddedPoliticalView: function() {
        this.renderMapBorder();
        this.setCellColors(null, '#333', null);
        this.renderOnlyPolticalBounds = false;

        for(var cellId=0; cellId < this.getCellCount(); cellId++ ) {
            var cell = this.getCellForId( cellId );
            if( cell != null && cell.zone != null ) {
                cell.cellColor = this.colorByZone[cell.zone];
                cell.siteColor = this.colorByZone[cell.zone];
                if(cell.water == true)
                {

                    cell.cellColor = "#91D0EF";
                    cell.siteColor = "#91D0EF";
                    cell.edgeColor = "#91D0EF";
                }
            }
        }
        this.renderAllCells();
    },

    renderPoliticalView: function() {
        this.renderMapBorder();
        this.setCellColors(null, '#333', null);
        this.renderOnlyPolticalBounds = true;

        for(var cellId=0; cellId < this.getCellCount(); cellId++ ) {
            var cell = this.getCellForId( cellId );
            if( cell != null && cell.zone != null ) {
                cell.cellColor = this.colorByZone[cell.zone];
                cell.siteColor = this.colorByZone[cell.zone];
                if(cell.water == true)
                {
                    cell.cellColor = "#91D0EF";
                    cell.siteColor = "#91D0EF";
                }
            }
        }
        this.renderAllCells();
    },

    setCellColors: function(cellColor, edgeColor, siteColor) {
        var cells = this.diagram.cells;
        for ( i in cells) {
            var cell = cells[i];
            if(cellColor != null) {
                cell.cellColor = cellColor;
            }
            if(edgeColor != null) {
                cell.edgeColor = edgeColor;
            }
            if(siteColor != null) {
                cell.siteColor = siteColor;
            }
        }
    },


    renderStainedGlassView: function() {
        this.renderMapBorder();
        this.renderOnlyPolticalBounds = false;
        this.setCellColors(null, '#333', null);
        for(var cellId=0; cellId < this.getCellCount(); cellId++ ) {
            var cell = this.getCellForId( cellId );
            if( cell != null ) {
                var color = this.randomHexColor();
                cell.cellColor = color;
                cell.siteColor = color;
            }
        }
        this.renderAllCells();
    },

    renderAllCells: function() {
        for (var i =0; i<this.getCellCount(); i++) {
            this.renderCell(i);
        }
        for (var i =0; i<this.getCellCount(); i++) {
            this.renderEdges(i);
        }
    },

    assignZones: function() {
        var zoneRootIds = this.selectZoneStartingCellIds();
        // Timeslice between multi-site random flood-fill.
        // Store nodes that might be valid expansion points here.
        var zoneToValidAdjacent = [];
        // while(this.zone()) {
            var cellsAssigned = 0;
            while(cellsAssigned < this.getCellCount())
            {
                for(var zoneNumber=0; zoneNumber < zoneRootIds.length; zoneNumber++) {
                   // Unsure datastore is generateialized.
                   if(zoneToValidAdjacent[zoneNumber] == null) {
                        zoneToValidAdjacent[zoneNumber] = [];
                   }

                   if(this.zoneToContains[zoneNumber] == null)
                   {
                        this.zoneToContains[zoneNumber] = [];
                   }

                   if(this.zoneToContains[zoneNumber].length == 0) {
                        // Don't have a start node yet, get one
                        var cellId = zoneRootIds[zoneNumber];
                        this.getCellForId(cellId).zone = zoneNumber;
                        cellsAssigned++;
                        this.zoneToContains[zoneNumber].push(cellId);
                        zoneToValidAdjacent[zoneNumber] = this.findAdjacentCells(cellId);
                        continue;
                   }

                   if(zoneToValidAdjacent[zoneNumber].length == 0)
                   {
                        // this zone is done growing
                        continue;
                   }
                   var cellArrayIndexToTry = this.randomIntegerInRange(0, zoneToValidAdjacent[zoneNumber].length - 1);
                   var cellIdToTry = zoneToValidAdjacent[zoneNumber][cellArrayIndexToTry];
                   var cellId = cellIdToTry;
                   var cell = this.getCellForId(cellId);
                   if(cell.zone == null) {
                        cell.zone = zoneNumber;
                        cellsAssigned++;
                        this.zoneToContains[zoneNumber].push(cellId);
                        var adjacents = this.findAdjacentCells(cellId);
                        zoneToValidAdjacent[zoneNumber] = this.mergeArray(zoneToValidAdjacent[zoneNumber], adjacents);
                        
                        for (value in this.zoneToContains[zoneNumber]) {
                            zoneToValidAdjacent[zoneNumber] = zoneToValidAdjacent[zoneNumber].filter(function(element){
                                return element !== value;
                            }); // ensure no adjacent zone have already been added.
                        }
                   }
                }
            }
        // }
    },

    zone: function() {
        var cells = this.diagram.cells;
        for(x in cells) {
            if(cells[x].zone == null)
            {
                return true;
            }
        }
    },

    // merge two arrays purging duplicates, 
    // this is lazy, no shame.
    mergeArray: function(a, b) {

        var x = {};
        var res = [];

        for (i in a) {
            x[a[i]] = 1;
            res.push(a[i]);
        }

        for (k in b) {
            if(x[b[k]] == null)
            {
                res.push(b[k]);
                x[b[k]] = 1;
            }
        }
        return res;
    },

    getCellForId: function(cellId) {
        return this.diagram.cells[cellId];
    },

    findAdjacentCells: function(cellId) {
        var cell = this.getCellForId(cellId);
        var halfEdges = cell.halfedges;
        var adjacents = [];
        for(var k=0; k < halfEdges.length; k++) {
            var lSite = halfEdges[k].edge.lSite;
            var rSite = halfEdges[k].edge.rSite;
            if(lSite != null && lSite.voronoiId != cellId) {
                adjacents.push(lSite.voronoiId);
            }
            else if(lSite == null) {
                this.edgeCellObject[cellId] = 1;
            }
            if(rSite != null && rSite.voronoiId != cellId) {
                adjacents.push(rSite.voronoiId);
            }
            else if(rSite == null) {
                this.edgeCellObject[cellId] = 1;
            }
        }
        return adjacents;
    },

    compute: function(sites) {
        this.sites = sites;
        this.voronoi.recycle(this.diagram);
        this.diagram = this.voronoi.compute(sites, this.bbox);
        this.treemap = this.buildTreemap();
    },

    inArray: function(array, value) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] == value) return true;
        }
        return false;
    },

    selectZoneStartingCellIds: function() {
        var arr = [];
        var i=0;
        while(i < this.numberOfZones) {
            var randomNumber = this.randomIntegerInRange(0,this.getCellCount() - 1);
            if(!this.inArray(arr, randomNumber))
            {
                arr.push(randomNumber);
                i++;
            }
        }
        return arr;
    },

    // Returns a random integer between min (inclusive) and max (inclusive)
    randomIntegerInRange: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomHexColor: function() {
        var proposedHex = "#" + Math.floor((Math.abs(Math.sin(this.randomIntegerInRange(0,this.numberOfZones - 1 * 40)) * 16777215)) % 16777215).toString(16);
        var missingChars = 7 - proposedHex.length;
        for ( var i = 0; i < missingChars; i++ ) {
            proposedHex += "0";
        }

        return proposedHex;
    },

    clearSites: function() {
        this.compute([]);
    },

    randomSites: function(n, clear) {
        var sites = [];
        if (!clear) {
            sites = this.sites.slice(0);
        }
        // create vertices
        var xmargin = this.canvas.width * this.margin,
            ymargin = this.canvas.height * this.margin,
            xo = xmargin,
            dx = this.canvas.width - xmargin * 2,
            yo = ymargin,
            dy = this.canvas.height - ymargin * 2;
        for (var i = 0; i < n; i++) {
            sites.push({
                x: self.Math.round((xo + self.Math.random() *
                    dx) * 10) / 10,
                y: self.Math.round((yo + self.Math.random() *
                    dy) * 10) / 10
            });
        }
        this.compute(sites);
    },

    getCellCount: function() {
        return this.diagram.cells.length;
    },

    relaxSites: function() {
        if (!this.diagram) {
            return;
        }
        var cells = this.diagram.cells,
            iCell = cells.length,
            cell,
            site, sites = [],
            rn, dist;
        var p = 1 / iCell * 0.1;
        while (iCell--) {
            cell = cells[iCell];
            rn = Math.random();
            // probability of apoptosis
            if (rn < p) {
                continue;
            }
            site = this.cellCentroid(cell);
            dist = this.distance(site, cell.site);
            // don't relax too fast
            if (dist > 2) {
                site.x = (site.x + cell.site.x) / 2;
                site.y = (site.y + cell.site.y) / 2;
            }
            // probability of mytosis
            if (rn > (1 - p)) {
                dist /= 2;
                sites.push({
                    x: site.x + (site.x - cell.site.x) / dist,
                    y: site.y + (site.y - cell.site.y) / dist,
                });
            }
            sites.push(site);
        }
        this.compute(sites);
    },

    distance: function(a, b) {
        var dx = a.x - b.x,
            dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    cellArea: function(cell) {
        var area = 0,
            halfedges = cell.halfedges,
            iHalfedge = halfedges.length,
            halfedge,
            p1, p2;
        while (iHalfedge--) {
            halfedge = halfedges[iHalfedge];
            p1 = halfedge.getStartpoint();
            p2 = halfedge.getEndpoint();
            area += p1.x * p2.y;
            area -= p1.y * p2.x;
        }
        area /= 2;
        return area;
    },

    cellCentroid: function(cell) {
        var x = 0,
            y = 0,
            halfedges = cell.halfedges,
            iHalfedge = halfedges.length,
            halfedge,
            v, p1, p2;
        while (iHalfedge--) {
            halfedge = halfedges[iHalfedge];
            p1 = halfedge.getStartpoint();
            p2 = halfedge.getEndpoint();
            v = p1.x * p2.y - p2.x * p1.y;
            x += (p1.x + p2.x) * v;
            y += (p1.y + p2.y) * v;
        }
        v = this.cellArea(cell) * 6;
        return {
            x: x / v,
            y: y / v
        };
    },

    buildTreemap: function() {
        var treemap = new QuadTree({
            x: this.bbox.xl,
            y: this.bbox.yt,
            width: this.numberOfSites * 7,
            height: this.numberOfSites * 7
        });
        var cells = this.diagram.cells,
            iCell = cells.length;
        while (iCell--) {
            bbox = cells[iCell].getBbox();
            bbox.cellid = iCell;
            treemap.insert(bbox);
        }
        return treemap;
    },

    cellUnderMouse: function(ev) {
        if (!this.diagram) {
            return;
        }
        var canvas = document.getElementById('voronoiCanvas');
        if (!canvas) {
            return;
        }
        var x = 0,
            y = 0;
        if (!ev) {
            ev = window.event;
        }

        if (ev.pageX || ev.pageY) {
            x = ev.pageX;
            y = ev.pageY;
        } 
        else if (e.clientX || e.clientY) {
            x = ev.clientX + document.body.scrollLeft + document.documentElement
                .scrollLeft;
            y = ev.clientY + document.body.scrollTop + document.documentElement
                .scrollTop;
        }
        x -= canvas.offsetLeft;
        y -= canvas.offsetTop;
        cellid = this.cellIdFromPoint(x, y);

        var str = "(" + x + "," + y + ") = " + cellid + "-- ";
        if(cellid != null)
        {
            str += this.getCellForId(cellid).zone;
        }
        document.getElementById('voronoiCellId').innerHTML = str;
    },

    cellIdFromPoint: function(x, y) {
        // We build the treemap on-demand
        if (this.treemap === null) {
            return;
        }
        // Get the Voronoi cells from the tree map given x,y
        var items = this.treemap.retrieve({
                x: x,
                y: y
            }),
            iItem = items.length,
            cells = this.diagram.cells,
            cell, cellid;
        while (iItem--) {

            cellid = items[iItem].cellid;
            cell = cells[cellid];
            if (cell.pointIntersection(x, y) > 0) {
                return cellid;
            }
        }
        return undefined;
    },

    renderCell: function(id) {
        if (id === undefined) {
            return;
        }
        if (!this.diagram) {
            return;
        }
        var cell = this.getCellForId(id);
        if (!cell) {
            return;
        }
        this.renderCellWithColor(id, cell.cellColor, cell.edgeColor, cell.siteColor);
    },

    renderEdges: function(id){
        if (id === undefined) {
            return;
        }
        if (!this.diagram) {
            return;
        }
        var cell = this.getCellForId(id);
        if (!cell) {
            return;
        }
        var drawingContext = this.canvas.getContext('2d');
        drawingContext.globalAlpha = 1;
        var halfedges = cell.halfedges;
        var nHalfedges = halfedges.length;


        // Cell outline for political bounds
        for (var iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
            var halfedge = halfedges[iHalfedge];
            var start = halfedges[iHalfedge].getStartpoint();
            var end = halfedges[iHalfedge].getEndpoint();
            if(this.renderOnlyPolticalBounds == true) {
                if(halfedge.politicalBound) {
                    drawingContext.beginPath();
                    drawingContext.moveTo(start.x, start.y);
                    drawingContext.lineTo(end.x, end.y);
                    drawingContext.strokeStyle = cell.edgeColor;
                    drawingContext.fillStyle = cell.edgeColor;
                    drawingContext.lineWidth=2;
                    drawingContext.stroke();
                }
            }
            else if(this.renderOnlyPolticalBounds == false)
            {
                drawingContext.beginPath();
                drawingContext.moveTo(start.x, start.y);
                drawingContext.lineTo(end.x, end.y);
                drawingContext.strokeStyle = cell.edgeColor;
                drawingContext.lineWidth=1;
                drawingContext.stroke();
            }
        }
    },

    renderCellWithColor: function(id, cellColor, edgeColor, siteColor) {
        if (id === undefined) {
            return;
        }
        if (!this.diagram) {
            return;
        }
        var cell = this.getCellForId(id);
        if (!cell) {
            return;
        }
        var drawingContext = this.canvas.getContext('2d');
        drawingContext.globalAlpha = 1;
        // edges
        drawingContext.beginPath();
        var halfedges = cell.halfedges;
        var nHalfedges = halfedges.length;
        var v = halfedges[0].getStartpoint();

        // cell body
        drawingContext.moveTo(v.x, v.y);
        for (var iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
            v = halfedges[iHalfedge].getEndpoint();
            drawingContext.lineTo(v.x, v.y);
        }
        drawingContext.strokeStyle = cellColor;
        drawingContext.fillStyle = cellColor;
        drawingContext.fill();
        drawingContext.stroke();
        
        // site
        v = cell.site;
        drawingContext.fillStyle = siteColor;
        drawingContext.beginPath();
        drawingContext.rect(v.x - 2 / 3, v.y - 2 / 3, 2, 2);
        drawingContext.fill();
    },

    renderMapBorder: function() {
        var drawingContext = this.canvas.getContext('2d');
        // background
        drawingContext.globalAlpha = 1;
        drawingContext.beginPath();
        drawingContext.rect(0, 0, this.canvas.width, this.canvas.height);
        drawingContext.fillStyle = this.voronoiCellColor;
        drawingContext.fill();
        drawingContext.stokeStyle = this.voronoiEdgeColor;
        drawingContext.stroke();
    }
};

window.onload = function() {
  var map = Map;
  map.generate();
  var gui = new dat.GUI();
  gui.add(map, 'numberOfSites', 15, 4000);
  gui.add(map, 'chanceOfWater', 0, 100);
  gui.add(map, 'numberOfZones', 4, 14);
  gui.add(map, 'consistency', 0, 30);
  gui.add(map, 'generate');
  gui.add(map, 'saveImage');
  var viewFolder = gui.addFolder('Alternate Views');
  viewFolder.add(map, 'renderVoronoiView');
  viewFolder.add(map, 'renderStainedGlassView');
  viewFolder.add(map, 'renderZoneView');
  viewFolder.add(map, 'renderPoliticalView');
  viewFolder.add(map, 'renderGriddedPoliticalView');
  viewFolder.open();
};

window.onmousemove=Map.cellUnderMouse(event);
