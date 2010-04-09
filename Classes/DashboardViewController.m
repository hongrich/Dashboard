//
//  DashboardViewController.m
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

#import "DashboardViewController.h"
#import "DashboardWidget.h"

@implementation DashboardViewController

@synthesize addButton;
@synthesize widgetsView;
@synthesize containerView;

@synthesize newButton;

- (void)viewDidLoad {
    [super viewDidLoad];
        
    CGSize appSize = self.containerView.frame.size;

    UIImage *addImage = [UIImage imageNamed:@"DashboardAdd.png"];
    self.addButton = [UIButton buttonWithType:UIButtonTypeCustom];
    self.addButton.frame = CGRectMake(BUTTON_SPACING, appSize.height - BUTTON_SPACING - 34.0, 34.0, 34.0);
    [self.addButton setImage:addImage forState:UIControlStateNormal];
    [self.addButton addTarget:self action:@selector(toggleWidgetsView) forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:self.addButton];

    UIImage *newImage = [[UIImage imageNamed:@"DashboardNew.png"] stretchableImageWithLeftCapWidth:19.0 topCapHeight:0];
    self.newButton = [UIButton buttonWithType:UIButtonTypeCustom];
    [self.newButton setTitle:@"Find New Widgets..." forState:UIControlStateNormal];
    self.newButton.frame = CGRectMake(80.0, appSize.height - BUTTON_SPACING - 37.0, [self.newButton.titleLabel.text sizeWithFont:self.newButton.titleLabel.font].width + 38.0, 37.0);
    [self.newButton setBackgroundImage:newImage forState:UIControlStateNormal];
    [self.newButton addTarget:self action:@selector(showDownloadView) forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:self.newButton];
    self.newButton.alpha = 0.0;

    self.widgetsView = [[[DashboardWidgetsView alloc] initWithFrame:CGRectMake(0, appSize.height - WIDGETVIEW_H, appSize.width, WIDGETVIEW_H) delegate:self] autorelease];
	[self.view insertSubview:self.widgetsView belowSubview:self.containerView];
}

#pragma mark -
#pragma mark DashboardWidgetsViewDelegate

- (void)widgetDidAdd:(DashboardWidget *)widget {
    [self.containerView addSubview:widget];
    
    /*
     // Add the view and ripple
     [UIView beginAnimations:@"ripple" context:nil];
     [UIView setAnimationDuration:2.0];
     [UIView setAnimationTransition:110 forView:self.containerView cache:YES];
     [self.containerView addSubview:widget];
     [UIView commitAnimations];
     */
}

- (void)itemDidRemove:(NSString *)bundleIdentifier {
    // Remove all widgets with the same bundle identifier
    for (DashboardWidget *widget in [self.containerView subviews]) {
        if ([widget isKindOfClass:[DashboardWidget class]]) {
            if ([widget.bundleIdentifier isEqualToString:bundleIdentifier]) {
                [widget closeWidget];
            }
        }
    }
}

#pragma mark -
#pragma mark DownloadView

- (void)showDownloadView {    
    DashboardDownloadViewController *downloadView = [[DashboardDownloadViewController alloc] initWithNibName:@"DashboardDownloadViewController" bundle:nil];
    [self presentModalViewController:downloadView animated:YES];
    [downloadView release];

    [self.widgetsView endEditing];
}

#pragma mark -
#pragma mark WidgetsView

- (void)toggleWidgetsView {
	if ( !showingWidgetsView ) {
		[self showWidgetsView:YES];
	} else {
		[self hideWidgetsView:YES];
	}

	showingWidgetsView = !showingWidgetsView;
}

- (void)animationDidStop:(NSString *)animationID finished:(NSNumber *)finished context:(void *)context {
    [self.view bringSubviewToFront:self.widgetsView];
}

- (void)showWidgetsView:(BOOL)animated {
    if (animated) {
        [self.view bringSubviewToFront:self.containerView];
        [UIView beginAnimations:@"ShowWidgetsView" context:NULL];
        [UIView setAnimationDuration:0.6];
        [UIView setAnimationDelegate:self];
        [UIView setAnimationDidStopSelector:@selector(animationDidStop:finished:context:)];
    }

	[widgetsView showScrollView:animated];

    CGRect containerFrame = self.containerView.frame;
    containerFrame.size.height -= WIDGETVIEW_H;
    self.containerView.frame = containerFrame;
    
    CGPoint addCenter = self.addButton.center;
    addCenter.y -= WIDGETVIEW_H;
    self.addButton.center = addCenter;
	self.addButton.transform = CGAffineTransformMakeRotation(- M_PI * 3 / 4);

    CGPoint newCenter = self.newButton.center;
    newCenter.y -= WIDGETVIEW_H;
    self.newButton.center = newCenter;
    self.newButton.alpha = 1.0;

    [self.view bringSubviewToFront:self.addButton];
    [self.view bringSubviewToFront:self.newButton];
    
    // Show close button for all widgets and fix positions
    for (DashboardWidget *widget in [self.containerView subviews]) {
        if ([widget isKindOfClass:[DashboardWidget class]]) {
            widget.closeButton.hidden = NO;
            [widget layoutSubviews];
        }
    }
    
    if (animated) {
        [UIView commitAnimations];
    }
}

- (void)hideWidgetsView:(BOOL)animated {
    if (animated) {
        [UIView beginAnimations:@"HideWidgetsView" context:NULL];
        [UIView setAnimationDuration:0.6];
    }

	[widgetsView hideScrollView:animated];

    CGRect containerFrame = self.containerView.frame;
    containerFrame.size.height += WIDGETVIEW_H;
    self.containerView.frame = containerFrame;

    CGPoint addCenter = self.addButton.center;
    addCenter.y += WIDGETVIEW_H;
    self.addButton.center = addCenter;
	self.addButton.transform = CGAffineTransformMakeRotation(0);

    CGPoint newCenter = self.newButton.center;
    newCenter.y += WIDGETVIEW_H;
    self.newButton.center = newCenter;
    self.newButton.alpha = 0.0;
    
    [self.view sendSubviewToBack:self.widgetsView];

    // Hide close buttons for all widgets
    for (DashboardWidget *widget in [self.containerView subviews]) {
        if ([widget isKindOfClass:[DashboardWidget class]]) {
            widget.closeButton.hidden = YES;
        }
    }

    if (animated) {
        [UIView commitAnimations];
    }
}

#pragma mark -
#pragma mark Rotation

// Override to allow orientations other than the default portrait orientation.
- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation {
    return YES;
}

- (void)didRotateFromInterfaceOrientation:(UIInterfaceOrientation)fromInterfaceOrientation {

}

- (void)willAnimateRotationToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation duration:(NSTimeInterval)duration {
    if (showingWidgetsView) {
        [self hideWidgetsView:NO];
    }

    CGSize appSize = self.containerView.bounds.size;
    CGRect addButtonFrame = self.addButton.frame;
    CGRect newButtonFrame = self.newButton.frame;
    CGRect widgetsViewFrame = self.widgetsView.frame;

    addButtonFrame.origin.y = appSize.height - BUTTON_SPACING - addButtonFrame.size.height;
    newButtonFrame.origin.y = appSize.height - BUTTON_SPACING - newButtonFrame.size.height;
    widgetsViewFrame.origin.y = appSize.height - WIDGETVIEW_H;
    widgetsViewFrame.size.width = appSize.width;

    self.addButton.frame = addButtonFrame;
    self.newButton.frame = newButtonFrame;
    self.widgetsView.frame = widgetsViewFrame;

    for (DashboardWidget *widget in [self.containerView subviews]) {
        if ([widget isKindOfClass:[DashboardWidget class]]) {
            [widget setNeedsLayout];
        }
    }
    if (showingWidgetsView) {
        [self showWidgetsView:NO];
    }
    /*
    NSLog(@"%f %f %f %f", newButtonFrame.origin.x, newButtonFrame.origin.y, newButtonFrame.size.width, newButtonFrame.size.height);
    NSLog(@"%f %f %f %f", self.containerView.frame.origin.x, self.containerView.frame.origin.y, self.containerView.frame.size.width, self.containerView.frame.size.height);
    NSLog(@"%f %f %f %f", self.addButton.frame.origin.x, self.addButton.frame.origin.y, self.addButton.frame.size.width, self.addButton.frame.size.height);
    */
}

- (void)didReceiveMemoryWarning {
	// Releases the view if it doesn't have a superview.
    [super didReceiveMemoryWarning];
	
	// Release any cached data, images, etc that aren't in use.
}

- (void)viewDidUnload {
	// Release any retained subviews of the main view.
	// e.g. self.myOutlet = nil;

}

- (void)dealloc {
	self.addButton = nil;
	self.widgetsView = nil;
    self.containerView = nil;
    self.newButton = nil;
    [super dealloc];
}

@end
