var MapProc = {
    voronoi: new Voronoi(),
    diagram: null,
    margin: 0.0,
    canvas: null,
    numberOfNodes: 1000,
    cellsForPlate: [],
    plateToContains: [],
    bbox: {
        xl: 0,
        xr: 800,
        yt: 0,
        yb: 600
    },
    numberOfPlates: 10,
    plateRootIds: [],
    sites: [],
    numberOfIterations: 2,
    showPlates: true,
    treemap: null,
    hoverColor: '#00ffff',

    init: function() {
        this.canvas = document.getElementById('voronoiCanvas');
        this.randomSites(this.numberOfNodes, true);
        for (var i = 0; i < this.numberOfIterations; i++) {
            this.relaxSites();
        }
        this.treemap = this.buildTreemap();
        this.assignPlates();
        
        // Toggle goes here.
        // this.renderVoronoiView();
        this.renderPlateView();
        // this.renderStainedGlassView();
    },

    renderVoronoiView: function() {
        this.renderMapBorder();
        Voronoi.prototype.Cell.prototype.cellColor='#ffffff';
        Voronoi.prototype.Cell.prototype.edgeColor='#333';
        Voronoi.prototype.Cell.prototype.siteColor='#ff0000';
        this.renderAllCells();
    },

    renderPlateView: function() {
        this.renderMapBorder();
        Voronoi.prototype.Cell.prototype.cellColor='#ffffff';
        Voronoi.prototype.Cell.prototype.edgeColor='#333';
        Voronoi.prototype.Cell.prototype.siteColor='#ff0000';

        var colorByPlate = [];

        for(var plateNumber = 0; plateNumber < this.numberOfPlates; plateNumber++) {
            colorByPlate[plateNumber] = this.randomHexColor();
        }

        for(var cellId=0; cellId < this.numberOfNodes; cellId++ ) {
            var cell = this.getCellForId( cellId );
            if(cell == null)
            {
                console.log("culprit");
                console.log(cellId);
            }
            if( cell != null && cell.plate != null ) {
                cell.cellColor = colorByPlate[cell.plate];
            }
        }
        this.renderAllCells();
    },

    renderStainedGlassView: function() {
        this.renderMapBorder();
        Voronoi.prototype.Cell.prototype.edgeColor='#333';
        for(var cellId=0; cellId < this.numberOfNodes; cellId++ ) {
            var cell = this.getCellForId( cellId );
            if( cell != null ) {
                var color = this.randomHexColor();
                cell.cellColor = color;
                cell.siteColor = color;
                Voronoi.prototype.Cell.prototype.siteColor
            }
        }
        this.renderAllCells();
    },

    renderAllCells: function() {
        for (var i =0; i<this.numberOfNodes; i++) {
            this.renderCell(i);
        }
    },

    assignPlates: function() {
        this.plateRootIds = this.selectPlateStartingCellIds();
        // Timeslice between multi-site random flood-fill.
        // Store nodes that might be valid expansion points here.
        var plateToValidAdjacent = [];
        while(this.hasNodesNotAssignedToPlates()) {
            for(var nodesAssigned = 0; nodesAssigned < this.numberOfNodes; nodesAssigned++ ) {
                for(var plateNumber=0; plateNumber < this.plateRootIds.length; plateNumber++) {
                   // Unsure datastore is initialized.
                   if(plateToValidAdjacent[plateNumber] == null) {
                        plateToValidAdjacent[plateNumber] = [];
                        this.plateToContains[plateNumber] = [];
                   }

                   if(this.plateToContains[plateNumber].length == 0) {
                        // Don't have a start node yet, get one
                        var cellId = this.plateRootIds[plateNumber];
                        this.getCellForId(cellId).plate = plateNumber;
                        this.plateToContains[plateNumber].push(cellId);
                        plateToValidAdjacent[plateNumber] = this.findAdjacentCells(cellId);
                   }

                   if(plateToValidAdjacent[plateNumber].length == 0)
                   {
                        // this plate is done growing
                        continue;
                   }

                   var cellArrayIndexToTry = this.randomIntegerInRange(0, plateToValidAdjacent[plateNumber].length - 1);
                   var cellIdToTry = plateToValidAdjacent[plateNumber][cellArrayIndexToTry];
                   var cellId = cellIdToTry;
                   var cell = this.getCellForId(cellId);

                   if(cell.plate == null) {
                        cell.plate = plateNumber;
                        this.plateToContains[plateNumber].push(cellId);
                        plateToValidAdjacent[plateNumber] = this.mergeArray(plateToValidAdjacent[plateNumber], this.findAdjacentCells(cellId));
                        
                        for (value in this.plateToContains[plateNumber]) {
                            plateToValidAdjacent[plateNumber] = plateToValidAdjacent[plateNumber].filter(function(element){
                                return element !== value;
                            }); // ensure no adjacent plates have already been added.
                        }
                   }
                }
            }
        }
    },

    hasNodesNotAssignedToPlates: function() {
        var cells = this.diagram.cells;
        for(x in cells) {
            if(cells[x].plate == null)
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
            if(rSite != null && rSite.voronoiId != cellId) {
                adjacents.push(rSite.voronoiId);
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

    selectPlateStartingCellIds: function(numberToSelect) {
    	var arr = [];
    	var i=0;
    	while(i < this.numberOfPlates) {
    		var randomNumber = this.randomIntegerInRange(0,this.numberOfNodes - 1);
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
        return "#" + Math.floor((Math.abs(Math.sin(this.randomIntegerInRange(0,this.numberOfPlates - 1 * 40)) * 16777215)) % 16777215).toString(16);
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
            width: this.numberOfNodes * 5,
            height: this.numberOfNodes * 5
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

        if (this.lastCellId !== cellid) {
            if (this.lastCellId !== undefined) {
                var lastCell = this.getCellForId(this.lastCellId);
                this.renderCell(this.lastCellId);
            }
            if (cellid !== undefined) {
                var cell = this.getCellForId(cellid);
                this.renderCellWithColor(cellid, this.hoverColor, cell.edgeColor, cell.siteColor);
            }
            this.lastCellId = cellid;
        }

        document.getElementById('voronoiCellId').innerHTML = "(" + x + "," + y + ") = " + cellid + "-- " + this.getCellForId(cellid).plate;
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
        var halfedges = cell.halfedges,
            nHalfedges = halfedges.length,
            v = halfedges[0].getStartpoint();
        drawingContext.moveTo(v.x, v.y);
        for (var iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
            v = halfedges[iHalfedge].getEndpoint();
            drawingContext.lineTo(v.x, v.y);
        }
        drawingContext.fillStyle = cellColor;
        drawingContext.strokeStyle = edgeColor;
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