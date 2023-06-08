var star;

let video;
let poseNet;
let poses = [];
let signals;
let index=0;
let maxIndex=0;

function modelReady() {
  select('#status').html('Model Loaded');
}

function readEdfFile( buff ){
    decoder.setInput( buff );
    decoder.decode();
    var output = decoder.getOutput();
    console.log( output );
  }


function setup() {
        // Create the canvas
        var canvas = createCanvas(300, 300);
        let constraints = {audio: true, "video": {
        "width": 320,
        "height": 240
          }};
        video = createCapture(constraints);
        poseNet = ml5.poseNet(video, modelReady);
        // This sets up an event that fills the global variable "poses"
        // with an array every time new poses are detected
        poseNet.on('pose', function(results) {
          poses = results;
        });
        // Hide the video element, and just show the canvas
        video.hide();
        canvas.mousePressed(userStartAudio);
        mic = new p5.AudioIn();

        // start the Audio Input.
        // By default, it does not .connect() (to the computer speakers)
        mic.start();

        var decoder = new edfdecoder.EdfDecoder();
        const fileName = 'S001E01.edf';

        fetch(fileName)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                decoder.setInput(arrayBuffer);
                decoder.decode();
                signals = decoder.getOutput();
                maxIndex=signals.getNumberOfRecords()
                print(maxIndex)
                console.log( signals );
                //readEdfFile(arrayBuffer);
            })
            .catch(error => {
                console.error('Error loading EDF file:', error);
            });

        // Create the star
        var position = createVector(width / 2, height / 2);
        var radius = 40;
        var fadingFactor = 0.2;
        var flaresActivity = 0.8;
        var imageWidth = Math.max(width, height);
        var flaresColor=255
        star = new Star(position, radius, fadingFactor, flaresActivity, flaresColor,imageWidth);
    };

    // Execute the sketch
function draw() {
        // Clean the canvas
        if (typeof signals != 'undefined') {
            rawsig=signals.getPhysicalSignal(0, index+1);
            let colBac = parseInt(map(rawsig[0], -200, 200, 0, 255));
            //print(colBac)
            background(colBac);
            //print(rawsig[0]);
            index=index+1
            if(index>maxIndex-2){
                index=0
            }
          }
        
        let vol = mic.getLevel()*100;
        let colorVol = parseInt(map(vol, 0, 10, 0, 255));
        //let colorVol = vol
        xpos=0;
        ypos=0;
        if(poses.length>0){
          let pose = poses[0].pose;
          let keypoint = pose.keypoints[0];
          xpos=keypoint.position.x;
          ypos=keypoint.position.y;
           // Update the star flaring effect depending on the mouse position
          if (xpos > 0 && xpos < width && ypos > 0 && ypos < height) {
              star.setFadingFactor(0.7 * (1 - 2* xpos / width));
              star.setFlaresActivity(0.1 + 2 * ypos / height);
          }
        }
        star.setColor(colorVol)
        //print(vol)
        
        
        //Update the star
        star.update();

        // Paint the star
        star.paint();
    };

    /*
     * The Star class
     */
    function Star(position, radius, fadingFactor, flaresActivity, flaresColor,imageWidth) {
        this.position = position;
        this.radius = radius;
        this.fadingFactor = fadingFactor;
        this.flaresActivity = flaresActivity;
        this.imageWidth = imageWidth;
        this.body = createImage(this.imageWidth, this.imageWidth);
        this.flares = createImage(this.imageWidth, this.imageWidth);
        this.timeCounter = 0;
        this.flaresColor=flaresColor;

        // Initialize the star's body image
        var x, y, pixel, distanceSq;
        var radiusSq = sq(this.radius);
        var center = this.imageWidth / 2;

        this.body.loadPixels();

        for (x = 0; x < this.imageWidth; x++) {
            for (y = 0; y < this.imageWidth; y++) {
                pixel = 4 * (x + y * this.imageWidth);
                distanceSq = sq(x - center) + sq(y - center);
                this.body.pixels[pixel] = 255;
                this.body.pixels[pixel + 1] = 255;
                this.body.pixels[pixel + 2] = 255;
                this.body.pixels[pixel + 3] = 255 * (0.95 - distanceSq / radiusSq);
            }
        }

        this.body.updatePixels();
    }

    //
    // The update method
    //
    Star.prototype.update = function () {
        var x, y, deltaX, deltaY, pixel, distanceSq, relativeAngle;
        var dx, dy, sumColor, counter, pixelColor;
        var radiusSq = sq(this.radius);
        var center = this.imageWidth / 2;
        var nPixels = sq(this.imageWidth);

        // Create the flares in the star's body (save the result in the red channel)
        this.flares.loadPixels();

        for (x = 0; x < this.imageWidth; x++) {
            for (y = 0; y < this.imageWidth; y++) {
                deltaX = x - center;
                deltaY = y - center;
                distanceSq = sq(deltaX) + sq(deltaY);

                if (distanceSq < radiusSq) {
                    relativeAngle = atan2(deltaY, deltaX) / TWO_PI;

                    if (relativeAngle < 0) {
                        relativeAngle++;
                    }

                    pixel = 4 * (x + y * this.imageWidth);
                    this.flares.pixels[pixel] = 255 * noise(0.1 * (Math.sqrt(distanceSq) - this.timeCounter), 10 * relativeAngle);
                }
            }
        }

        // Smooth the flares (save the result in the blue and alpha channels)
        for (x = 2; x < this.imageWidth - 2; x++) {
            for (y = 2; y < this.imageWidth - 2; y++) {
                pixel = 4 * (x + y * this.imageWidth);
                deltaX = x - center;
                deltaY = y - center;
                distanceSq = sq(deltaX) + sq(deltaY);
                sumColor = 0;
                counter = 0;

                // Loop over nearby pixels
                for (dx = -2; dx <= 2; dx++) {
                    for (dy = -2; dy <= 2; dy++) {
                        if (sq(deltaX + dx) + sq(deltaY + dy) < distanceSq) {
                            sumColor += this.flares.pixels[pixel + 4 * (dx + dy * this.imageWidth)];
                            counter++;
                        }
                    }
                }

                if (counter > 0) {
                    this.flares.pixels[pixel + 2] = sumColor / counter;
                    this.flares.pixels[pixel + 3] = 255 * (1 - this.fadingFactor) * radiusSq / distanceSq;
                } else {
                    this.flares.pixels[pixel + 2] = 0;
                    this.flares.pixels[pixel + 3] = 0;
                }
            }
        }

        // Update the flares image (i.e. the red and green channels)
        for (i = 0; i < nPixels; i++) {
            pixel = 4 * i;
            pixelColor = this.flares.pixels[pixel + 2];
            this.flares.pixels[pixel] = pixelColor;
            this.flares.pixels[pixel + 1] = this.flaresColor;
        }

        this.flares.updatePixels();

        // Increase the time counter
        this.timeCounter += this.flaresActivity;
    };

    //
    // The paint method
    //
    Star.prototype.paint = function () {
        push();
        translate(this.position.x - this.imageWidth / 2, this.position.y - this.imageWidth / 2);
        image(this.flares, 0, 0);
        image(this.body, 0, 0);
        pop();
    };

    //
    // Update the fading factor parameter
    //
    Star.prototype.setFadingFactor = function (fadingFactor) {
        this.fadingFactor = fadingFactor;
    };

    Star.prototype.setFlaresActivity = function (flaresActivity) {
        this.flaresActivity = flaresActivity;
    };

    //
    // Update the flares activity parameter
    //
    Star.prototype.setColor = function (flaresColor) {
        this.flaresColor = flaresColor;
    };