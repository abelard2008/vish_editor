/*
 * Track the progress of a learner during a session.
 * Used by the SCORM API.
 */
VISH.ProgressTracking = (function(V,$,undefined){

	//Auxiliar vars
	var objectives = {};
	var minRequiredTime = 1;
	var hasScore = false;


	var init = function(animation,callback){
		_createObjectives();

		//Subscribe to events

		// Check if all slides have been viewed
		// V.EventsNotifier.registerCallback(V.Constant.Event.onEnterSlide, function(params){
		// });

		// Check the average time viewing slides
		minRequiredTime = _getMinRequiredTime();
		setTimeout(function(){
			objectives["slide_average_time"].completed = true;
			objectives["slide_average_time"].progress = 1;
			V.EventsNotifier.notifyEvent(V.Constant.Event.onProgressObjectiveUpdated,objectives["slide_average_time"],false);
		},minRequiredTime*1000);

		//Quizzes
		V.EventsNotifier.registerCallback(V.Constant.Event.onAnswerQuiz, function(params){
			V.Debugging.log("onAnswerQuiz");
			V.Debugging.log(params);
		});
	};

	var _getMinRequiredTime = function(){
		var AVERAGE_SLIDE_TIME = 4; //seg
		try {
			_minRequiredTime = V.Viewer.getCurrentPresentation().slides.length * AVERAGE_SLIDE_TIME;
		} catch(e) {
			_minRequiredTime = 1;
		}
		return _minRequiredTime;
	};

	//Return a value in a [0,1] scale
	var getProgressMeasure = function(){
		//Adjust slide_average_time progress if is not 100%
		if (objectives["slide_average_time"].progress<1){
			objectives["slide_average_time"].progress = Math.min(1,V.TrackingSystem.getAbsoluteTime()/minRequiredTime);
		}

		var overallProgressMeasure = 0;
		Object.keys(objectives).forEach(function(key){
			overallProgressMeasure += objectives[key].progress * objectives[key].completion_weight;
		});

		return overallProgressMeasure;
	};

	//Return a value in a [0,1] scale
	var getScore = function(){
		//TODO. Take into account objectives with scores.
		//
		var overallScore = 0;
		return 0;
	};

	var getHasScore = function(){
		return hasScore;
	};

	var getObjectives = function(){
		return objectives;
	};


	/////////////
	// Helpers
	/////////////

	var _createObjectives = function(){
		var presentation = V.Viewer.getCurrentPresentation();

		var slidesL = presentation.slides.length;
		for(var i=0; i<slidesL; i++){
			var slide = presentation.slides[i];
			if(slide.containsQuiz==true){
				var slideElementsL = slide.elements.length;
				for(var j=0; j<slideElementsL; j++){
					var element = slide.elements[j];
					if(element.type===V.Constant.QUIZ){
						if(element.selfA===true){
							//Self-assessed quiz
							hasScore = true;

							//Create objective
							var quizScore = 10;
							if((typeof element.settings == "object")&&(typeof element.settings.score != "undefined")){
								quizScore = parseInt(element.settings.score);
							}

							//Quiz score is the score_weight. Later all these weights will be normalized to sum to one.
							var quizObjective = new Objective(element.quizId,undefined,quizScore);
							objectives[quizObjective.id] = quizObjective;
						}
					}
				}
			}
		}

		//Create an objective that requires to spent a minimum average time viewing the slides.
		var timeObjective = new Objective("slide_average_time");
		if(hasScore){
			timeObjective.completion_weight = 0.5;
		} else {
			timeObjective.completion_weight = 1;
		}
		objectives[timeObjective.id] = timeObjective;

		//Fill completion weights
		var objectivesKeys = Object.keys(objectives);
		var nObjectives = objectivesKeys.length;

		if(nObjectives>1){
			var defaultCompletionWeight = (1-timeObjective.completion_weight)/(nObjectives-1);
			var scoreWeightSum = 0;

			objectivesKeys.forEach(function(key){ 
				if(typeof objectives[key].completion_weight == "undefined"){
					objectives[key].completion_weight = defaultCompletionWeight;
				}
				if(typeof objectives[key].score_weight == "number"){
					//Calculate sum to normalize score_weight
					scoreWeightSum += objectives[key].score_weight;
				}
			});

			if(scoreWeightSum > 0){
				objectivesKeys.forEach(function(key){ 
					if(typeof objectives[key].score_weight == "number"){
						//Normalize score_weight
						objectives[key].score_weight = objectives[key].score_weight/scoreWeightSum;
					}
				});
			};
		};	
	};


	/////////////
	// Constructors
	/////////////

	var Objective = function(id,completion_weight,score_weight,description){
		this.id = id;
		this.seq_id = _getObjectiveId();
		this.completed = false;
		this.progress = 0;
		this.score = undefined;
		this.success = undefined;
		if(typeof completion_weight == "number"){
			this.completion_weight = completion_weight;
		}
		if(typeof score_weight == "number"){
			this.score_weight = score_weight;
		}
		if(typeof description == "string"){
			this.description = description;
		}
	};

	var lastObjectiveId = -1;
	var _getObjectiveId = function(){
		lastObjectiveId += 1;
		return lastObjectiveId;
	};


	return {
		init					: init,
		getProgressMeasure		: getProgressMeasure,
		getScore				: getScore,
		getHasScore				: getHasScore,
		getObjectives			: getObjectives
	};

}) (VISH, jQuery);