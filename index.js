var util = require('./lib/util')
	, mkdirp = require('mkdirp')
	, _ = require('underscore')
	, path = require('path');

/** Function: defaultPathBuilder
 * This function builds paths for a screenshot file. It is appended to the
 * constructors base directory and gets prependend with `.png` or `.json` when
 * storing a screenshot or JSON meta data file.
 *
 * Parameters:
 *     (Object) spec - The spec currently reported
 *     (Array) descriptions - The specs and their parent suites descriptions
 *     (Object) result - The result object of the current test spec.
 *     (Object) capabilities - WebDrivers capabilities object containing
 *                             in-depth information about the Selenium node
 *                             which executed the test case.
 *
 * Returns:
 *     (String) containing the built path
 */
function defaultPathBuilder(spec, descriptions, results, capabilities) {
	return util.generateGuid();
}

/** Function: defaultMetaDataBuilder
 * Uses passed information to generate a meta data object which can be saved
 * along with a screenshot.
 * You do not have to add the screenshots file path since this will be appended
 * automatially.
 *
 * Parameters:
 *     (Object) spec - The spec currently reported
 *     (Array) descriptions - The specs and their parent suites descriptions
 *     (Object) result - The result object of the current test spec.
 *     (Object) capabilities - WebDrivers capabilities object containing
 *                             in-depth information about the Selenium node
 *                             which executed the test case.
 *
 * Returns:
 *     (Object) containig meta data to store along with a screenshot
 */
function defaultMetaDataBuilder(spec, descriptions, results, capabilities) {
	var metaData = {
			description: descriptions.join(' ')
			, passed: results.passed()
			, os: capabilities.caps_.platform
			, browser: {
				name: capabilities.caps_.browserName
				, version: capabilities.caps_.version
			}
		};
	metaData.trace = "";
	metaData.message = "";
	var testcaseID = metaData.description;
	var top = -1;

	//Check and display top custom message
	if (detailReport.hasOwnProperty(testcaseID)) {
		if (detailReport[testcaseID].hasOwnProperty(top)) {
			for (var j = 0; j < detailReport[testcaseID][top].length; j++) {
				if (detailReport[testcaseID][top][j].type === 'link') {
					metaData.message += '<p><a target="_blank" href="' + detailReport[testcaseID][top][j].url +
						'">' + detailReport[testcaseID][top][j].text + '</a></p>';
				}
				else {
					metaData.message += '<p>' + detailReport[testcaseID][top][j].text + '</p>';
				}
			}
		}
	}

	for (var i = 0; i < results.items_.length; i++) {
		var result = results.items_[i];
		var priorItem = "", inlineItem = "", postItem = "", item = "";

		//Check and display custom message for each verification point (expect())
		if (detailReport.hasOwnProperty(testcaseID)) {
			if (detailReport[testcaseID].hasOwnProperty(i)) {
				for (var j = 0; j < detailReport[testcaseID][i].length; j++) {
					if (detailReport[testcaseID][i][j].type === 'link') {
						item = '<a target="_blank" href="' + detailReport[testcaseID][i][j].url +
							'">' + detailReport[testcaseID][i][j].text + '</a><br>';
					}
					else {
						item = detailReport[testcaseID][i][j].text + '<br>';
					}

					position = detailReport[testcaseID][i][j].position;
					if (position == 0) inlineItem += item;
					else if (position == 1) postItem += item;
					else priorItem += item;
				}
			}
		}

		metaData.message += '<p>';
		if (priorItem.length > 0)
			metaData.message += priorItem;
		metaData.message += '<b>' + (i+1) + '</b>. ';
		if (inlineItem.length > 0) metaData.message += inlineItem;


		//Refine output message before displaying
		var msg = result.message;
		if (result.message) {
			//cut the session info
			var index = msg.indexOf("(Session info:");
			if (index >= 0) {
				msg = msg.substr(0, index);
			}
			//format message in case html result
			index = msg.indexOf("<");
			if (index >= 0) {
				msg = msg.substr(0, index) + "<pre>" + msg.substr(index) + "</pre>";
			}
		}

		//Check and display expected result(s) for this test case
		if(results.passed()){//Test case is passed, that means all verification points (expect()) are passed
			metaData.message += msg || 'Passed.';
			metaData.trace += '<br>' + result.trace.stack;
		}else{//Test case is failed, that means at least one VP is failed
			if (result.message != 'Passed.') {//a failed VP in this failed case
				metaData.message += '<span style="color: red">';
				metaData.message += result.message + '</span>' || 'Failed.';
			}
			else {//a pass VP in this failed case
				metaData.message += '<span style="color: green">';
				metaData.message += result.message + '</span>' || 'Passed.';
			}
			metaData.trace += '<br>' + result.trace? ('<p>' + result.trace.stack + '</p>' || 'No Stack trace information') : 'No Stack trace information';
		}
		if (postItem.length > 0) metaData.message += '<br>' + postItem;
		metaData.message += '</p>';
	}

	return metaData;
}



/** Class: ScreenshotReporter
 * Creates a new screenshot reporter using the given `options` object.
 *
 * For more information, please look at the README.md file.
 *
 * Parameters:
 *     (Object) options - Object with options as described below.
 *
 * Possible options:
 *     (String) baseDirectory - The path to the directory where screenshots are
 *                              stored. If not existing, it gets created.
 *                              Mandatory.
 *     (Function) pathBuilder - A function which returns a path for a screenshot
 *                              to be stored. Optional.
 *     (Function) metaDataBuilder - Function which returns an object literal
 *                                  containing meta data to store along with
 *                                  the screenshot. Optional.
 *     (Boolean) takeScreenShotsForSkippedSpecs - Do you want to capture a
 *                                                screenshot for a skipped spec?
 *                                                Optional (default: false).
 */
function ScreenshotReporter(options) {
	options = options || {};
	if(!options.baseDirectory || options.baseDirectory.length === 0) {
		throw new Error('Please pass a valid base directory to store the ' +
			'screenshots into.');
	} else {
		this.baseDirectory = options.baseDirectory;
	}

	if(typeof (options.cssOverrideFile) !== 'undefined' && _.isString(options.cssOverrideFile) ){
		this.cssOverrideFile = options.cssOverrideFile;
	} else {
		this.cssOverrideFile = null;
	}

	this.pathBuilder = options.pathBuilder || defaultPathBuilder;
	this.docTitle = options.docTitle || 'Generated test report';
	this.docName = options.docName || 'report.html';
	this.metaDataBuilder = options.metaDataBuilder || defaultMetaDataBuilder;
	this.preserveDirectory = options.preserveDirectory || false;
	this.takeScreenShotsForSkippedSpecs =
		options.takeScreenShotsForSkippedSpecs || false;
		this.takeScreenShotsOnlyForFailedSpecs =
 		options.takeScreenShotsOnlyForFailedSpecs || false;
 	this.finalOptions = {
 		takeScreenShotsOnlyForFailedSpecs: this.takeScreenShotsOnlyForFailedSpecs,
 		takeScreenShotsForSkippedSpecs: this.takeScreenShotsForSkippedSpecs,
 		metaDataBuilder: this.metaDataBuilder,
 		pathBuilder: this.pathBuilder,
 		baseDirectory: this.baseDirectory,
 		docTitle: this.docTitle,
 		docName: this.docName,
 		cssOverrideFile: this.cssOverrideFile
 	};

 	if(!this.preserveDirectory){
 		util.removeDirectory(this.finalOptions.baseDirectory);
 	}
}

/** Function: reportSpecResults
 * Called by Jasmine when reporting results for a test spec. It triggers the
 * whole screenshot capture process and stores any relevant information.
 *
 * Parameters:
 *     (Object) spec - The test spec to report.
 */
ScreenshotReporter.prototype.reportSpecResults =
function reportSpecResults(spec) {
	/* global browser */
	var self = this
		, results = spec.results();

	//ignore setup and teardown
	if (results.description == labelBeforeAll || results.description == labelAfterAll)
		return;

	if(!self.takeScreenShotsForSkippedSpecs && results.skipped) {
		return;
	}

	browser.takeScreenshot().then(function (png) {
		browser.getCapabilities().then(function (capabilities) {
			var descriptions = util.gatherDescriptions(
					spec.suite
					, [spec.description]
				)


				, baseName = self.pathBuilder(
					spec
					, descriptions
					, results
					, capabilities
				)
				, metaData = self.metaDataBuilder(
					spec
					, descriptions
					, results
					, capabilities
				)

				, screenShotFile = baseName + '.png'
				, metaFile = baseName + '.json'
				, screenShotPath = path.join(self.baseDirectory, screenShotFile)
				, metaDataPath = path.join(self.baseDirectory, metaFile)

				// pathBuilder can return a subfoldered path too. So extract the
				// directory path without the baseName
				, directory = path.dirname(screenShotPath);

			metaData.screenShotFile = screenShotFile;
			mkdirp(directory, function(err) {
				if(err) {
					throw new Error('Could not create directory ' + directory);
				} else {
					util.addMetaData(metaData, metaDataPath, descriptions, self.finalOptions);
					console.log(metaData.description + (metaData.passed ? " - Pass" : " - Fail"));
					if(!(self.takeScreenShotsOnlyForFailedSpecs && results.passed())) {
						util.storeScreenShot(png, screenShotPath);
					}	
					util.storeMetaData(metaData, metaDataPath);
				}
			});
		});
	});

};

module.exports = ScreenshotReporter;