//
//  DashboardWidgetItem.m
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

#import "DashboardWidgetItem.h"

@implementation DashboardWidgetItem

@synthesize label;
@synthesize closeButton;
@synthesize icon;
@synthesize path;
@synthesize dragGesture;

- (id)initWithFrame:(CGRect)frame image:(UIImage *)image path:(NSString *)aPath {
    if (self = [super initWithFrame:frame]) {
        // Initialization code
        CGRect buttonFrame = CGRectZero;
        buttonFrame.origin.x = 12.0 + ((image.size.width < 80.0) ? floor((80.0-image.size.width)/2.0) : 0.0);
        buttonFrame.origin.y = 12.0 + ((image.size.height < 80.0) ? floor((80.0-image.size.height)/2.0) : 0.0);
        buttonFrame.size.width = MIN(80.0, image.size.width);
        buttonFrame.size.height = MIN(80.0, image.size.height);
        
        self.icon = [UIButton buttonWithType:UIButtonTypeCustom];
        self.icon.frame = buttonFrame;
        [self.icon setBackgroundImage:image forState:UIControlStateNormal];
        [self addSubview:self.icon];
        
        // Add close button
        UIImage *closeImage = [UIImage imageNamed:@"DashboardClose.png"];
        self.closeButton = [UIButton buttonWithType:UIButtonTypeCustom];
        self.closeButton.frame = CGRectMake(0, 0, 30, 30);
        [self.closeButton setImage:closeImage forState:UIControlStateNormal];
        [self addSubview:self.closeButton];
        self.closeButton.hidden = YES;
        
        self.path = aPath;
        NSBundle *widgetBundle = [NSBundle bundleWithPath:self.path];
        NSString *name = [widgetBundle objectForInfoDictionaryKey:@"CFBundleDisplayName"];
        // Hack for stupid widget dev that can't name Info.plist or didn't include a correct key
        if (!name) {
            name = [[[widgetBundle bundlePath] lastPathComponent] stringByReplacingOccurrencesOfString:@".wdgt" withString:@""];
        }
        
		self.label = [[[UILabel alloc] initWithFrame:CGRectMake(2.0, 102.0, 100.0, 14.0)] autorelease];
		self.label.text = name;
		self.label.backgroundColor = [UIColor clearColor];
		self.label.font = [UIFont boldSystemFontOfSize:12.0];
		self.label.textAlignment = UITextAlignmentCenter;
		self.label.textColor = [UIColor darkGrayColor];
		self.label.shadowColor = [UIColor whiteColor];
		self.label.shadowOffset = CGSizeMake(0, 1);
		[self addSubview:self.label];
    }
    return self;
}

- (void)wobbleStart {
    #define RADIANS(degrees) ((degrees * M_PI) / 180.0)
    
    CGAffineTransform leftWobble = CGAffineTransformRotate(CGAffineTransformIdentity, RADIANS(-1.5));
    CGAffineTransform rightWobble = CGAffineTransformRotate(CGAffineTransformIdentity, RADIANS(1.5));
    
    self.icon.transform = leftWobble;  // starting point
    
    [UIView beginAnimations:@"wobble" context:self.icon];
    [UIView setAnimationRepeatAutoreverses:YES]; // important
    [UIView setAnimationRepeatCount:FLT_MAX];
    [UIView setAnimationDuration:0.1];
    [UIView setAnimationDelegate:self];
    
    self.icon.transform = rightWobble; // end here & auto-reverse
    
    [UIView commitAnimations];
}

- (void)wobbleStop {
    [UIView beginAnimations:@"nothing" context:self.icon];
    self.icon.transform = CGAffineTransformIdentity;
    [UIView setAnimationRepeatCount:1.0];
    [UIView setAnimationDuration:0.0];
    [UIView commitAnimations];
}

- (void)dealloc {
	self.label = nil;
    self.closeButton = nil;
    self.icon = nil;
    self.path = nil;
    self.dragGesture = nil;
    [super dealloc];
}

@end
