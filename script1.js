var canvas = $('canvas');
var context = canvas[0].getContext('2d');
var imageObj = new Image();
var rotationAngle = 0; // Initial rotation angle
var isRotating = false; // Flag variable to track the animation state
var mode = "display";
var initialPolygonsState = null;

$('#addZone').click(function() {
  mode = "draw";
});

disableAddressCard();


imageObj.onload = function() {
    $(canvas).attr({
        width: this.width,
        height: this.height
    });
    context.drawImage(imageObj, 0, 0);
};

/*
// Set width of imageObj
imageObj.width = 600; // replace with desired width
imageObj.height = 400; // replace with desired width

imageObj.onload = function() {
    console.log("Image loaded successfully");
    // Calculate the scale to fit the image entirely inside the canvas
    var scale = Math.min(canvas.width / this.width, canvas.height / this.height);

    // Calculate the top left position to center the image
    var x = (canvas.width / 2) - (this.width / 2) * scale;
    var y = (canvas.height / 2) - (this.height / 2) * scale;

    // Draw the image on canvas
    context.drawImage(imageObj, x, y, this.width * scale, this.height * scale);
};
*/

imageObj.src = '../static/images/video_stream_mock.jpg';

function generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

var positionId = '';
var polygons = {
  //[generateGUID()]: []
};

$(document).ready(function () {
  var url = window.location.href;
  var path = url.split('?')[0];  // Extract the path part before the query parameters
  currentPolygonId = path.substring(path.lastIndexOf('/') + 1);

  $.ajax({
      url: `http://158.160.70.195:8123/get_entry/${currentPolygonId}`,
      type: 'get',
      data: JSON.stringify(polygons),
      contentType: "application/json",
      async: false,
      success: function(response) {
          //console.log(response);
          positionId = response.id;

          // TODO: refactor
          $.each(response.zones, function(index, zone) {
            var currentZone = zone;
            polygons[currentZone.id] = currentZone.polygon;

              var inputObject = currentZone.polygon;
              var outputArray = [];
              
              for (var i = 1; i <= 4; i++) {
                var xKey = "x" + i;
                var yKey = "y" + i;
                var newObj = {x: inputObject[xKey], y: inputObject[yKey]};
                outputArray.push(newObj);
              }
              polygons[currentZone.id] = outputArray;
          });
          polygons[generateGUID()] = [];
      },
      error: function(error) {
          console.log(error);
      }
  });

});

/*
// TODO: for debug, get from api
polygons.push([
  {x: 574, y: 250}, 
  {x: 20, y: 197},
  {x: 171, y: 151},
  {x: 539, y: 115}
]);
redraw();
*/

var selectedPolygonIndex = null;
var selectedPointIndex = null;
//var mode = "draw"; // Starts in draw mode
var isDragging = false;

function pointInPolygon(point, polygon) {
    var inside = false;
    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        var xi = polygon[i].x,
            yi = polygon[i].y;
        var xj = polygon[j].x,
            yj = polygon[j].y;
        var intersect = ((yi > point.y) != (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function drawPolygon(points, highlight = false) {
    context.fillStyle = highlight ? 'rgba(255,0,0,0.5)' : 'rgba(100,100,100,0.5)';
    context.strokeStyle = "#df4b26";
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
        context.lineTo(points[i].x, points[i].y);
    }
    context.closePath();
    context.fill();
    context.stroke();
};

function drawPoints(points) {
    context.strokeStyle = "#df4b26";
    context.lineJoin = "round";
    context.lineWidth = 5;

    for (var i = 0; i < points.length; i++) {
        context.beginPath();
        context.arc(points[i].x, points[i].y, 3, 0, 2 * Math.PI, false);
        context.fillStyle = (i === selectedPointIndex) ? '#ff0000' : '#ffffff';
        context.fill();
        context.lineWidth = 5;
        context.stroke();
    }
};

function redraw() {
  canvas[0].width = canvas[0].width; // Clears the canvas 
  context.drawImage(imageObj, 0, 0);

  var polygonKeys = Object.keys(polygons);
  
  for (var i = 0; i < polygonKeys.length; i++) {
      var key = polygonKeys[i];
      var polygon = polygons[key];
      
      if (polygon.length > 0) {
          drawPolygon(polygon, key === selectedPolygonIndex);
          drawPoints(polygon);
      }
  }
};

// TODO: join with block of code below 
canvas.contextmenu(function(e) {
  e.preventDefault();

  var point = {
      x: e.offsetX,
      y: e.offsetY
  };

  var polygonKeys = Object.keys(polygons);
  
  for (var i = 0; i < polygonKeys.length; i++) {
      var key = polygonKeys[i];
      var polygon = polygons[key];
      
      if (polygon.length > 0 && pointInPolygon(point, polygon)) {
          selectedPolygonIndex = key;
          showContextMenu(e, selectedPolygonIndex);
          return false; // Prevents the event from propagating further
      }
  }

  return false;
});

function showContextMenu(e, polygonIndex) {
  var contextMenu = $('#contextMenu');

  // Position the menu at the mouse position
  contextMenu.css({
      top: e.pageY + 'px',
      left: e.pageX + 'px'
  }).show();

  // Attach click handlers to the menu items
  contextMenu.find('#editPolygon').off('click').click(function() {
    initialPolygonsState = JSON.parse(JSON.stringify(polygons));
    mode = "select";
    contextMenu.hide();
  });

  contextMenu.find('#deletePolygon').off('click').click(function() {
    $('#deleteZonePopup').css('display', 'block');
    $('#mainContent').css('filter', 'blur(5px)');
    $('#deleteYesButton').attr('onclick', `deleteZone('${polygonIndex}')`);
    /*
    delete polygons[polygonIndex];
    if(Object.keys(polygons).length === 0){
        polygons[generateGUID()] = [];
    }
    redraw();
    contextMenu.hide();
    */
  });
}

$('#cancelAddingZone').click(function() {
  debugger;
  if(mode === "draw") {
      var lastPolygonKey = Object.keys(polygons)[Object.keys(polygons).length - 1];
      if(polygons[lastPolygonKey] && polygons[lastPolygonKey].length < 4) {
          delete polygons[lastPolygonKey];
      }
  }
  else if (mode === "select" && selectedPolygonIndex !== null) {
    if (initialPolygonsState !== null) {
      polygons = JSON.parse(JSON.stringify(initialPolygonsState));
      initialPolygonsState = null;
    }
  }
  redraw();
  mode = "display";
  disableAddressCard();
});

function disableAddressCard() {
  $('#addressForm input, #addressForm textarea, #addressForm select, #addressForm button').prop('disabled', true).val('');
  $('#addressCard').addClass('disabled-block');
}

function enableAddressCard() {
  $.ajax({
    url: `http://158.160.70.195:8123/get_zone/${positionId}/${selectedPolygonIndex}`,
    type: 'get',
    success: function(response) {
        $("#cityInput").val(response.city);
        $("#houseBuildingInput").val(response.houseBuilding);
        $("#houseNumberInput").val(response.houseNumber);
        $("#regionInput").val(response.region);
        $("#streetInput").val(response.street);
    },
    error: function(error) {
        console.log(error);
    }
});

  $('#addressForm input, #addressForm textarea, #addressForm select, #addressForm button').prop('disabled', false);
  $('#addressCard').removeClass('disabled-block');
}

canvas
    .mousedown(function(e) {
        if (mode === "display") {
          var point = {
            x: e.offsetX,
            y: e.offsetY
          };

          for (var key in polygons) {
            if (polygons.hasOwnProperty(key)) {
                if (pointInPolygon(point, polygons[key])) {
                    // If point is inside polygon, select it and redraw
                    selectedPolygonIndex = key;
                    redraw();
                    enableAddressCard();

                    return;
                }
            }
          }

          //$("#addressCard").css('visibility', 'hidden');
          //$('#addressForm input, #addressForm textarea, #addressForm select').prop('disabled', true);
          disableAddressCard();
          // If point is not inside any polygon, deselect and redraw
          selectedPolygonIndex = null;
          redraw();
        }

        var point = {
            x: e.offsetX,
            y: e.offsetY
        };

        var lastPolygonKey = Object.keys(polygons)[Object.keys(polygons).length - 1];

        if(!lastPolygonKey) { // If there are no keys (all polygons are deleted)
            lastPolygonKey = generateGUID(); // Create a new key
            polygons[lastPolygonKey] = []; // Add a new polygon
        }

        if (mode === "draw") {
          if(polygons[lastPolygonKey].length < 4){
            polygons[lastPolygonKey].push(point);
          }

          // Check if the polygon has 4 points
          if(polygons[lastPolygonKey].length === 4){
            // Switch to select mode and set the selected polygon index
            mode = "select";
            selectedPolygonIndex = lastPolygonKey;
            //$("#addressCard").css('visibility', 'visible');
            //$('#addressForm input, #addressForm textarea, #addressForm select').prop('disabled', false);
            enableAddressCard();
          }
        } else if (mode === "select"  && selectedPolygonIndex !== null) {
          var polygon = polygons[selectedPolygonIndex];
          for (var j = 0; j < polygon.length; j++) {
              var dx = polygon[j].x - point.x;
              var dy = polygon[j].y - point.y;
              if (dx * dx + dy * dy <= 25) { 
                  selectedPointIndex = j;
                  isDragging = true;
                  return;
              }
          }
          
        }

        redraw();
    })
    .mousemove(function(e) {
        var point = {
            x: e.offsetX,
            y: e.offsetY
        };

        if (isDragging && selectedPolygonIndex !== null && selectedPointIndex !== null) {
            polygons[selectedPolygonIndex][selectedPointIndex] = point;
            redraw();
        } else if (mode === "select") {
          var polygon = polygons[selectedPolygonIndex];

          if (polygon.length > 0) {
              for (var j = 0; j < polygon.length; j++) {
                  var dx = polygon[j].x - point.x;
                  var dy = polygon[j].y - point.y;
                  if (dx * dx + dy * dy <= 25) { // 25 is 5 squared (radius)
                      canvas.css('cursor', 'pointer');
                      return;
                  }
              }
          }
        }

        canvas.css('cursor', 'default');
    })
    .mouseup(function(e) {
        if (isDragging) {
            isDragging = false;
            //selectedPointIndex = null;
            //selectedPolygonIndex = null;
        }
    });

$(document).keyup(function(e) {
    if (e.code === "Space") {
        /*
        if(Object.values(polygons)[Object.values(polygons).length-1].length > 0){
            selectedPolygonIndex = null;
            polygons[generateGUID()] = [];
        }
        */
        /*
        if (polygons[polygons.length - 1].length > 0) {
          selectedPolygonIndex = null;
          //polygons.push([]);
          polygons[generateGUID()] = [];
        }
        */
        var lastPolygonKey = Object.keys(polygons)[Object.keys(polygons).length - 1];
        if(polygons[lastPolygonKey].length > 0 && polygons[lastPolygonKey].length < 5){
            selectedPolygonIndex = null;
            polygons[generateGUID()] = [];
        }

    } else if (e.code === "Delete") {
        if (selectedPolygonIndex !== null) {
            deleteZone(selectedPolygonIndex);
            delete polygons[selectedPolygonIndex];
            selectedPolygonIndex = null;
            if (Object.keys(polygons).length === 0) {
                polygons[generateGUID()] = [];
            }
            redraw();
        }
    } else if (e.code === "Enter") {
        mode = mode === "draw" ? "select" : "draw";
        selectedPolygonIndex = null;
        selectedPointIndex = null;
        redraw();
    }
});


function deleteZone(polygonIndex) {
  debugger;
  $.ajax({
      url: `http://158.160.70.195:8123/delete_zone/${positionId}/${polygonIndex}`, // TODO: change url
      type: 'delete',
      contentType: "application/json",
      success: function(response) {
        console.log(response);
        delete polygons[polygonIndex];
        if(Object.keys(polygons).length === 0){
            polygons[generateGUID()] = [];
        }
        redraw();
      },
      error: function(error) {
          console.log(error);
      }
  });

  redraw();
  $('#contextMenu').hide();
}

function updatePositionIdInRoute() {
  // Retrieve the current path
  let path = window.location.pathname;

  // Replace the desired route parameter
  const newRouteParam = positionId;
  path = path.replace(/\/[^/]+$/, `/${newRouteParam}`);

  // Update the URL with the modified path
  const newUrl = `${window.location.origin}${path}`;

  // Replace the current URL with the modified URL
  window.history.replaceState(null, null, newUrl);
}

function modifyUrlParam(paramName, newValue) {
  // Retrieve the current query string
  const queryString = window.location.search;

  // Parse the query string into an object
  const params = new URLSearchParams(queryString);

  // Modify the desired query parameter
  params.set(paramName, newValue);

  // Update the URL with the modified query parameters
  const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

  // Replace the current URL with the modified URL
  window.history.replaceState(null, null, newUrl);
}

// change position handler
$('#leftButton, #rightButton, #upButton, #downButton, #zoomInButton, #zoomOutButton').click(function() {
  var side = $(this).attr('data-side');
  var command = $(this).attr('data-command');
  var status = $(this).attr('data-status');

  // TODO: make ajax request to backend

  $('[data-status="active"]').each(function() {
    $(this).attr('data-status', 'inactive').removeClass('active-position-button');
  });

  if (status != 'active') {
    const newCommand = (command == "start") ? "stop" : "start";
    $(this).attr('data-status', 'active')
    .attr('data-command', newCommand)
    .addClass('active-position-button');

    // clear or redefine all position data
    positionId = generateGUID();
    polygons = {
      [generateGUID()]: []
    };
    selectedPolygonIndex = null;

    imageObj.src = '../static/images/video_stream_mock_2.jpg'; // TODO: debug
    redraw();
  }
});

$('#saveNewPosition').click(function() {
  updatePositionIdInRoute();
});

$('#saveZones').click(function(event) {
  event.preventDefault();
  $('#saveZonePopup').css('display', 'block');
  $('#mainContent').css('filter', 'blur(5px)');
});

$('#saveYesButton').click(function(event) {
  event.preventDefault();

  $('#saveZonePopup').css('display', 'none');
  $('#mainContent').css('filter', 'none');

  // Check if required fields are empty
  let isValid = true;
  $('#addressForm input[required], #addressForm textarea[required]').each(function() {
    if ($(this).val().trim() === '') {
      isValid = false;
      $(this).addClass('empty-input-error');
    } else {
      $(this).removeClass('empty-input-error');
    }
  });

  if (isValid) {
    const currentPolygon = polygons[selectedPolygonIndex];
    console.log(currentPolygon);

    const polygonCoords = {};
    currentPolygon.forEach((coord, index) => {
      polygonCoords[`x${index + 1}`] = coord.x;
      polygonCoords[`y${index + 1}`] = coord.y;
    });

    var positionData = {
      id: positionId,
      zones: [{
        id: selectedPolygonIndex,
        region: $('#regionInput').val(),
        city: $('#cityInput').val(),
        street: $('#streetInput').val(),
        houseNumber: $('#houseNumberInput').val(),
        houseBuilding: $('#houseBuildingInput').val(),
        polygon: polygonCoords
      }]
    };

    console.log("JSON.stringify(polygonsForDelete): " + JSON.stringify(positionData));
    debugger;
    $.ajax({
        url: 'http://158.160.70.195:8123/write_data', // TODO: change url
        type: 'post',
        data: JSON.stringify(positionData),
        contentType: "application/json",
        success: function(response) {
            console.log(response);
        },
        error: function(error) {
            console.log(error);
        }
    });

    mode = "display";
    disableAddressCard();
    console.log('Form submitted successfully!');
  } else {
    console.log('Please fill out all required fields.');
  }

  // TODO: ajax request to api
  return false;
});

$('#saveNoButton').click(function() {
  $('#saveZonePopup').css('display', 'none');
  $('#mainContent').css('filter', 'none');
  return false;
});

$('#deleteYesButton').click(function() {
  debugger;
  $('#deleteZonePopup').css('display', 'none');
  $('#mainContent').css('filter', 'none');

  mode = "display";
  //$("#addressCard").css("visibility", "hidden");
  //$('#addressForm input, #addressForm textarea, #addressForm select').prop('disabled', true);
  disableAddressCard();

  return false;
});

$('#deleteNoButton').click(function() {
  //document.getElementById('popup').style.display = 'block';
  //document.getElementById('mainContent').style.filter = 'blur(5px)';
  $('#deleteZonePopup').css('display', 'none');
  $('#mainContent').css('filter', 'none');
  return false;
});

function createNewZone() {

}