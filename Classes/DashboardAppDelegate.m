//
//  DashboardAppDelegate.m
//  Dashboard
//
//  Copyright (c) 2010 Rich Hong
//  
//  Permission is hereby granted, free of charge, to any person
//  obtaining a copy of this software and associated documentation
//  files (the "Software"), to deal in the Software without
//  restriction, including without limitation the rights to use,
//  copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the
//  Software is furnished to do so, subject to the following
//  conditions:
//  
//  The above copyright notice and this permission notice shall be
//  included in all copies or substantial portions of the Software.
//  
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
//  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
//  WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
//  OTHER DEALINGS IN THE SOFTWARE.
//

#import "DashboardAppDelegate.h"
#import "DashboardViewController.h"
#import "DashboardWidget.h"

static NSString *_widgetPath = nil;
static NSString *_widgetResourcesPath = nil;

@implementation DashboardAppDelegate

@synthesize window;
@synthesize viewController;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES);
    _widgetResourcesPath = [[[paths objectAtIndex:0] stringByAppendingPathComponent:@"WidgetResources"] retain];
    paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    _widgetPath = [[paths objectAtIndex:0] retain];

    // Override point for customization after app launch
    [window addSubview:viewController.view];
    [window makeKeyAndVisible];

    // Load dictionary of webViews back if there are any previously stored ones
    // Try / Catch for good luck
    @try {
        NSData *data;
        if ([[NSUserDefaults standardUserDefaults] boolForKey:@"doneWithDefaultWidgets"] == NO) {            
            // Open default widgets
            data = [NSData dataWithContentsOfFile:[[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:@"firstRun"]];
        }else {
            // Load from NSUserDefaults
            data = [[NSUserDefaults standardUserDefaults] objectForKey:@"widgets"];
        }

        if (data) {
            NSArray *widgets = [NSKeyedUnarchiver unarchiveObjectWithData:data];
            for (DashboardWidget *widget in widgets) {
                if ([widget isKindOfClass:[DashboardWidget class]]) {
                    // If this is a default widget, we have to fix some paths, re-initialize and hide closeButton
                    if ([[NSUserDefaults standardUserDefaults] boolForKey:@"doneWithDefaultWidgets"] == NO) {
                        widget.path = [[DashboardAppDelegate widgetPath] stringByAppendingPathComponent:[widget.path lastPathComponent]];
                        [widget initialize];
                        widget.closeButton.hidden = YES;
                    }
                    
                    [self.viewController.containerView addSubview:widget];
                }
            }
        }
        if ([[NSUserDefaults standardUserDefaults] boolForKey:@"doneWithDefaultWidgets"] == NO) {
            [[NSUserDefaults standardUserDefaults] setBool:YES forKey:@"doneWithDefaultWidgets"];
        }
    }
    @catch (NSException * e) {
        NSLog(@"%@", e);
    }

	return YES;
}

- (void)applicationWillTerminate:(UIApplication *)application {
    [[NSUserDefaults standardUserDefaults] setObject:self.viewController.widgetsView.paths forKey:@"widgetPaths"];
    [[NSUserDefaults standardUserDefaults] setObject:[NSKeyedArchiver archivedDataWithRootObject:[self.viewController.containerView subviews]] forKey:@"widgets"];

    /*
    NSData *data = [NSKeyedArchiver archivedDataWithRootObject:[self.viewController.containerView subviews]];
    [data writeToFile:@"/Users/rich/iPhone/Dashboard/firstRun" atomically:NO];
     */
}

- (void)applicationDidBecomeActive:(UIApplication *)application {
    [self.viewController.widgetsView reloadWidgets];
}

- (void)dealloc {
    [_widgetPath release];
    [_widgetResourcesPath release];
    [viewController release];
    [window release];
    [super dealloc];
}

+ (NSString*)widgetPath {
    return _widgetPath;
}

+ (NSString*)widgetResourcesPath {
    return _widgetResourcesPath;
}

@end
