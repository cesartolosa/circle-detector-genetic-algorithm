angular.module('circleDetectorApp', ['ui.bootstrap', 'ui.bootstrap-slider'])
    .controller("detectorController", function($scope) {
        var population,
            minimumRadius = 50,
            deltaRadius = 10,
            deltaTheta = 5,
            pow = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, 33554432, 67108864, 134217728, 268435456, 536870912, 1073741824, 2147483648, 4294967296],
            mutators = [{
                mutate: function(genotype) {
                    genotype.x = genotype.x ^ pow[getRandomInt(0, binaryLength.x)];
                    return genotype;
                }
            }, {
                mutate: function(genotype) {
                    genotype.y = genotype.y ^ pow[getRandomInt(0, binaryLength.y)];
                    return genotype;
                }
            }, {
                mutate: function(genotype) {
                    genotype.radius = genotype.radius ^ pow[getRandomInt(0, binaryLength.radius)];
                    return genotype;
                }
            }];

        $scope.showConfig = false;
        $scope.populationSize = 50;
        $scope.generations = 50;
        $scope.currentGeneration = 0;
        $scope.crosoverFactor = 0.5;
        $scope.mutationFactor = 0.01;
        $scope.bestGenotypes = [];
        $scope.processing = false;

        function setPopulation(newPupolation) {
            population = newPupolation;
        }

        function fill(basePopulation, populationSize) {
            while (basePopulation.length < populationSize) {
                basePopulation.push(new Genotype());
            }
        }

        function Genotype(x, y, radius) {
            if (x >= 0 && y >= 0 && radius >= 0) {
                this.x = x;
                this.y = y;
                this.radius = radius;
            } else {
                this.x = getRandomInt(0, image.width);
                this.y = getRandomInt(0, image.height);
                this.radius = getRandomInt(5, (image.height - 1) / 2)
            }
            this.fitness = null;
        };

        $scope.start = function() {
            $scope.showConfig = false;
            $scope.processing = true;
            $scope.bestGenotypes = [];
            clearCanvas();
            population = [];
            fill(population, $scope.populationSize);
            evol(1, population);

        }

        function evol(currentGeneration) {
            setTimeout(function() {
                $scope.currentGeneration = currentGeneration;
                if (currentGeneration > $scope.generations) {
                    $scope.bestGenotypes.reverse();
                    $scope.drawCircle(getBestGenotype(population));
                    $scope.processing = false;
                    $scope.$apply();
                } else {
                    setPopulation(nextPopulation(population));
                    var bestGenotype = getBestGenotype(population);
                    if (_.find($scope.bestGenotypes, bestGenotype) === undefined) {
                        $scope.bestGenotypes.push(bestGenotype);
                        if (bestGenotype.fitness === 1) {
                            $scope.message = 'Encontrado en: ' + $scope.currentGeneration + ' generaciones!!!';
                            $scope.$digest();
                            $scope.drawCircle(bestGenotype);
                            evol($scope.generations + 1);
                            return;
                        }
                    }
                    $scope.$digest();
                    $scope.drawCircle(bestGenotype);
                    evol(currentGeneration + 1);

                }
            }, 0);
        }

        function nextPopulation(basePopulation) {
            var bestGenotypes = [];
            evalPopulation(basePopulation);
            basePopulation = sortedPopulation(basePopulation);
            basePopulation.splice(0, Math.floor(basePopulation.length / 2));
            bestGenotypes = crossOver(basePopulation.concat(basePopulation));
            exposeToMutation(bestGenotypes);
            return bestGenotypes;
        }

        function getBestGenotype(basePopulation) {
            return _.sortBy(basePopulation, function(genotype) {
                return genotype.fitness;
            })[basePopulation.length - 1];
        }

        function evalPopulation(basePopulation) {
            for (var i = 0; i < basePopulation.length; i++) {
                basePopulation[i].fitness = getFitness(basePopulation[i]);
            };
        }

        function sortedPopulation(basePopulation) {
            return _.sortBy(basePopulation, function(genotype) {
                return genotype.fitness;
            });
        }

        function crossGenotypes(mother, father, crossoverPoint) {
            if (Math.random() > $scope.crosoverFactor) {
                return [father, mother];
            }
            crossoverPoint = pow[crossoverPoint] - 1;
            var cromosome = {};
            cromosome.mother = (mother.x << (binaryLength.y + binaryLength.radius)) | (mother.y << binaryLength.radius) | mother.radius;
            cromosome.father = (father.x << (binaryLength.y + binaryLength.radius)) | (father.y << binaryLength.radius) | mother.radius;
            cromosome.child1 = (cromosome.mother & crossoverPoint) | (cromosome.father & ~crossoverPoint);
            cromosome.child2 = (cromosome.father & crossoverPoint) | (cromosome.mother & ~crossoverPoint);
            // console.log('mother: ', JSON.stringify(mother), 'father: ', JSON.stringify(father), 'Crossover point: ', crossoverPoint, JSON.stringify(cromosome));

            return [
                new Genotype(
                    (cromosome.child1 >> (binaryLength.y + binaryLength.radius)), ((cromosome.child1 >> binaryLength.radius) & (pow[binaryLength.y] - 1)), (cromosome.child1 & (pow[binaryLength.radius] - 1))),
                new Genotype(
                    (cromosome.child2 >> (binaryLength.y + binaryLength.radius)), ((cromosome.child2 >> binaryLength.radius) & (pow[binaryLength.y] - 1)), (cromosome.child2 & (pow[binaryLength.radius] - 1)))
            ];
        }

        function crossOver(basePopulation) {
            var crossedPopulation = [];
            basePopulation = _.shuffle(basePopulation);
            while (basePopulation.length > 1) {
                var pair = getRandomInt(1, basePopulation.length);
                var crossoverPoint = getRandomInt(1, (binaryLength.x + binaryLength.y + binaryLength.radius));
                crossedPopulation = crossedPopulation.concat(crossGenotypes(basePopulation[0], basePopulation[pair], crossoverPoint));
                basePopulation.splice(0, 1);
                basePopulation.splice(pair - 1, 1);
            }
            if (basePopulation.length === 1) {
                crossedPopulation.push(basePopulation[0]);
            }
            return crossedPopulation;
        }

        function exposeToMutation(basePopulation, mutationFactor) {
            for (var i = 0; i < basePopulation.length; i++) {
                var probability = Math.random();
                if (probability <= $scope.mutationFactor) {
                    // console.log('>>> MUTATION !!! <<< ====================================');
                    // console.log('before: ', JSON.stringify(basePopulation[i]));
                    basePopulation[i] = mutators[getRandomInt(0, mutators.length)].mutate(basePopulation[i]);
                    // console.log('after: ', JSON.stringify(basePopulation[i]));
                }
            }
        }

        function getFitness(genotype) {
            var fitness = 0,
                point,
                r,
                g,
                b;
            if (genotype.radius > minimumRadius) {
                for (var theta = 0; theta < 360; theta += deltaTheta) {
                    point = new PerimeterPoint(genotype, theta);
                    r = pixels[((image.width * point.y) + point.x) * 4];
                    g = pixels[((image.width * point.y) + point.x) * 4 + 1];
                    b = pixels[((image.width * point.y) + point.x) * 4 + 2];
                    if (isUtilPixel(r, g, b, 250)) {
                        fitness++;
                    }
                };
                fitness *= deltaTheta / 360;
                if (fitness < 1) {
                    // Agregar puntaje por estar dentro del área de la imagen
                    if (0 < genotype.r + genotype.x && genotype.r + genotype.x < image.width) {
                        var positionFitness = fitness > 0 ? 0.1 : 0.01;
                        if (0 < genotype.r + genotype.y && genotype.r + genotype.y < image.height) {
                            positionFitness += fitness > 0 ? 0.1 : 0.01;;
                            // Evaluar por dentro y fuera del radio si hay circulo cerca con centro en el mismo punto del genotipo
                            var outsideFitness = 0,
                                insideFitness = 0;
                            for (var i = 1; i <= deltaRadius; i++) {
                                for (var theta = 0; theta < 360; theta += deltaTheta) {
                                    point = new PerimeterPoint(new Genotype(genotype.x, genotype.y, genotype.radius + i), theta);
                                    r = pixels[((image.width * point.y) + point.x) * 4];
                                    g = pixels[((image.width * point.y) + point.x) * 4 + 1];
                                    b = pixels[((image.width * point.y) + point.x) * 4 + 2];
                                    if (isUtilPixel(r, g, b, 250)) {
                                        outsideFitness++;
                                    }
                                    point = new PerimeterPoint(new Genotype(genotype.x, genotype.y, genotype.radius - i), theta);
                                    r = pixels[((image.width * point.y) + point.x) * 4];
                                    g = pixels[((image.width * point.y) + point.x) * 4 + 1];
                                    b = pixels[((image.width * point.y) + point.x) * 4 + 2];
                                    if (isUtilPixel(r, g, b, 250)) {
                                        insideFitness++;
                                    }

                                };
                            };
                            outsideFitness *= deltaTheta * deltaRadius / 360;
                            insideFitness *= deltaTheta * deltaRadius / 360;
                            if (outsideFitness > 0.5) {
                                fitness += outsideFitness * 0.5;
                            }
                            if (insideFitness > 0.5) {
                                fitness += insideFitness * 0.5;
                            }
                        }
                        fitness += positionFitness;
                    }
                }
            }
            return fitness > 1 ? 1 : fitness;
        }

        function PerimeterPoint(genotype, theta) {
            this.x = Math.floor(genotype.radius * Math.cos(theta)) + genotype.x;
            this.y = Math.floor(genotype.radius * Math.sin(theta)) + genotype.y;
        }

        function isUtilPixel(r, g, b, bgValue) {
            return r < bgValue && g < bgValue && r < bgValue && pixelDefined(r, g, b);
        }

        function pixelDefined(r, g, b) {
            return r !== undefined && g !== undefined && b !== undefined;
        }

        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        }

        // Variables y funciones relacionadas con la imagen
        var pixels;
        var image = new Image();
        image.width = 512;
        image.height = 256;
        var binaryLength = {
            x: 9,
            y: 8,
            radius: 7
        };
        $scope.currentDimentions = {
            width: 0,
            height: 0
        };
        image.onload = function() {
            pixels = getPixels(this, 'image-canvas');
            $scope.currentDimentions.width = image.width;
            $scope.currentDimentions.height = image.height;
            $scope.loading = false;
            $scope.$apply();
        };
        $scope.images = [{
            path: 'img/imagen1.png'
        }, {
            path: 'img/imagen2.png'
        }, {
            path: 'img/imagen3.png'
        }];
        $scope.selectedImage = '';
        $scope.loading = false;
        $scope.setImageSrc = function(path) {
            $scope.loading = true;
            bestGenotypes = [];
            clearCanvas();
            $scope.selectedImage = path;
            setTimeout(function() {
                if (path !== image.src) {
                    image.src = path;
                } else {
                    $scope.loading = false;
                }
            }, 500);
        };

        function getCanvas(width, height, id) {
            var c = document.getElementById(id);
            c.width = width;
            c.height = height;
            return c;
        }

        function getPixels(img, canvas_id) {
            var ctx = getCanvas(img.width, img.height, canvas_id).getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);
            var imgData = ctx.getImageData(0, 0, img.width, img.height);
            return imgData.data;
        }

        $scope.drawCircle = function(genotype) {
            var ctx = getCanvas(image.width, image.height, 'circle-canvas').getContext('2d');
            ctx.clearRect(0, 0, image.width, image.height);
            var x = genotype.x;
            var y = genotype.y;
            var radius = genotype.radius;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'rgba(0, 140, 0, 0.5)';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#003300';
            ctx.stroke();
        }

        function clearCanvas() {
            var ctx = getCanvas(image.width, image.height, 'circle-canvas').getContext('2d');
            ctx.clearRect(0, 0, image.width, image.height);
        }

    });
