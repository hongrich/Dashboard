//
//  DashboardWidgetsView.m
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

#import "DashboardWidgetsView.h"

@implementation DashboardWidgetsView

@synthesize items;
@synthesize paths;
@synthesize backgroundView;
@synthesize scrollView;
@synthesize editing;

+ (void)replacePathOfType:(NSString*)type inDirectory:(NSString*)dir {
    // Replace all "file:///System/Library/WidgetResources" with "file://" + widgetResourcesPath
    NSArray *files = [NSBundle pathsForResourcesOfType:type inDirectory:dir];
    for (NSString *path in files) {
        NSStringEncoding enc;
        NSString *file = [NSString stringWithContentsOfFile:path usedEncoding:&enc error:NULL];
        file = [file stringByReplacingOccurrencesOfString:@"/System/Library/WidgetResources" withString:[DashboardAppDelegate widgetResourcesPath]];
        [file writeToFile:path atomically:NO encoding:enc error:NULL];
    }
}

- (id)initWithFrame:(CGRect)frame delegate:(id<DashboardWidgetsViewDelegate>)aDelegate {
    if (self = [super initWithFrame:frame]) {
        // Initialization code
        delegate = aDelegate;

		self.backgroundView = [[[UIImageView alloc] initWithFrame:self.bounds] autorelease];
		self.backgroundView.image = [UIImage imageNamed:@"DashboardAppsBackground.png"];
		self.backgroundView.frame = CGRectMake(0.0, 0.0, self.backgroundView.image.size.width, self.backgroundView.image.size.height);
		[self addSubview:self.backgroundView];
		
		self.scrollView = [[[UIScrollView alloc] initWithFrame:self.bounds] autorelease];
        self.scrollView.alwaysBounceHorizontal = YES;
		[self addSubview:self.scrollView];
        
        // Create widget directory and copy over default widgets on the first run
        if ([[NSUserDefaults standardUserDefaults] boolForKey:@"doneWithFirstRun"] == NO) {
            NSString *widgetResourcesPath = [DashboardAppDelegate widgetResourcesPath];
            // Copy over WidgetResources directory under ~/Library if one does not exist yet
            if (![[NSFileManager defaultManager] fileExistsAtPath:widgetResourcesPath]) {
                NSError *error;
                [[NSFileManager defaultManager] copyItemAtPath:[[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:@"WidgetResources"] toPath:widgetResourcesPath error:&error];

                [DashboardWidgetsView replacePathOfType:@"js" inDirectory:[widgetResourcesPath stringByAppendingPathComponent:@"button"]];
                [DashboardWidgetsView replacePathOfType:@"js" inDirectory:[widgetResourcesPath stringByAppendingPathComponent:@"AppleClasses"]];
            }
            
            NSString *widgetPath = [DashboardAppDelegate widgetPath];
            // Create widgetPath directory if one does not exist yet
            if (![[NSFileManager defaultManager] fileExistsAtPath:widgetPath]) {
                [[NSFileManager defaultManager] createDirectoryAtPath:widgetPath attributes:nil];
            }
            
            NSString *bundlePath = [[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:@"Widgets"];
            NSArray *bundleWidgets = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:bundlePath error:NULL];
            self.paths = [[NSMutableArray alloc] initWithCapacity:[bundleWidgets count]];
            self.items = [[NSMutableArray alloc] initWithCapacity:[bundleWidgets count]];
            
            for (NSString *widget in bundleWidgets) {
                // If a default widget is not yet in ~/Library/Widgets, copy it over
                if (![[NSFileManager defaultManager] fileExistsAtPath:[widgetPath stringByAppendingPathComponent:widget]]) {
                    NSError *error;
                    if (![[NSFileManager defaultManager] copyItemAtPath:[bundlePath stringByAppendingPathComponent:widget] toPath:[widgetPath stringByAppendingPathComponent:widget] error:&error]) {
                        NSLog(@"%@", error);
                    }

                    [DashboardWidgetsView replacePathOfType:@"html" inDirectory:[widgetPath stringByAppendingPathComponent:widget]];
                }
                [self.paths addObject:[widget stringByReplacingOccurrencesOfString:bundlePath withString:@""]];
                [self.items addObject:[self addIcon:[self.paths lastObject] withFrame:CGRectMake(ICON_WIDTH * [self.items count], 0.0, ICON_WIDTH, self.bounds.size.height)]];
            }

            [[NSUserDefaults standardUserDefaults] setBool:YES forKey:@"doneWithFirstRun"];
        }else {
            self.paths = [[NSUserDefaults standardUserDefaults] objectForKey:@"widgetPaths"];

            if (self.paths) {
                self.items = [[NSMutableArray alloc] initWithCapacity:[self.paths count]];

                // Remove all downloading placeholders
                NSUInteger i;
                while ((i = [self.paths indexOfObject:PLACEHOLDER]) != NSNotFound) {
                    [self.paths removeObjectAtIndex:i];
                }
                
                // Add all items back in
                for (NSString *path in self.paths) {
                    [self.items addObject:[self addIcon:path withFrame:CGRectMake(ICON_WIDTH * [self.items count], 0.0, ICON_WIDTH, self.bounds.size.height)]];
                }
            }else{
                self.paths = [[NSMutableArray alloc] initWithCapacity:1];
            }
        }
        
        self.scrollView.contentSize = CGSizeMake(ICON_WIDTH * [self.items count], self.bounds.size.height);
    }
    return self;
}

- (void)reloadWidgets {
    NSString *widgetPath = [DashboardAppDelegate widgetPath];

    // Try to sync self.paths with widgets in widgetPath
    NSArray *bundleWidgets = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:widgetPath error:NULL];
    NSMutableSet *filteredSet = [NSMutableSet setWithArray:bundleWidgets];
    [filteredSet filterUsingPredicate:[NSPredicate predicateWithFormat:@"SELF ENDSWITH[c] '.wdgt'"]];
    NSMutableSet *pathSet = [NSMutableSet setWithArray:self.paths];
    // First, try to remove any old widgets that no longer exists
    [pathSet minusSet:filteredSet];
    for (NSString *path in pathSet) {
        NSUInteger i;
        while ((i = [self.paths indexOfObject:path]) != NSNotFound) {
            DashboardWidgetItem *item = [self.items objectAtIndex:i];
            [self removeItem:item.closeButton];
        }
    }
    // Then, try to add any new widgets that we find
    [filteredSet minusSet:[NSSet setWithArray:self.paths]];
    for (NSString *widget in filteredSet) {
        [self.paths addObject:widget];
        [self.items addObject:[self addIcon:[self.paths lastObject] withFrame:CGRectMake(ICON_WIDTH * [self.items count], 0.0, ICON_WIDTH, self.bounds.size.height)]];
    }
    
    self.scrollView.contentSize = CGSizeMake(ICON_WIDTH * [self.items count], self.bounds.size.height);
}

#pragma mark -
#pragma mark Add Widget

- (void)addWidget:(id)sender {
    if ([sender isKindOfClass:[UIButton class]] && [[sender superview] isKindOfClass:[DashboardWidgetItem class]]) {
        DashboardWidgetItem *item = (DashboardWidgetItem*)[sender superview];
    
        // Generate random string as widget identifier
        CFUUIDRef theUUID = CFUUIDCreate(NULL);
        NSString *identifier = (NSString *)CFUUIDCreateString(NULL, theUUID);
        CFRelease(theUUID);

        NSBundle *widgetBundle = [NSBundle bundleWithPath:item.path];
        
        NSInteger width = [[widgetBundle objectForInfoDictionaryKey:@"Width"] intValue];
        NSInteger height = [[widgetBundle objectForInfoDictionaryKey:@"Height"] intValue];
        
        // Create widget
        DashboardWidget *widget = [[DashboardWidget alloc] initWithFrame:CGRectMake(floor(([[self superview] bounds].size.width - width) / 2), floor(([[self superview] bounds].size.height - height) / 2), width, height) path:item.path identifier:identifier];
        // Add this widget to containerView
        [delegate widgetDidAdd:widget];
        
        // Release stuff
        [widget release];
        [identifier release];
    }
}

#pragma mark -
#pragma mark Editing

- (void)beginEditing {
    if (!self.editing) {
        // Show close button for all widgets
        for (DashboardWidgetItem *item in self.items) {
            if ([item isKindOfClass:[DashboardWidgetItem class]]) {
                item.closeButton.hidden = NO;
                [item wobbleStart];
                
                [item addGestureRecognizer:item.dragGesture];
            }
        }

        self.editing = YES;
    }
}

- (void)endEditing {
    if (self.editing) {
        // Hide close button for all widgets
        for (DashboardWidgetItem *item in self.items) {
            if ([item isKindOfClass:[DashboardWidgetItem class]]) {
                item.closeButton.hidden = YES;
                [item wobbleStop];

                [item removeGestureRecognizer:item.dragGesture];
            }
        }
        
        self.editing = NO;
    }
}

#pragma mark -
#pragma mark Button Events

- (void)buttonDrag:(UIGestureRecognizer *)sender {
    CGPoint origin;
    NSInteger column;
    
    switch (sender.state) {
        case UIGestureRecognizerStateBegan:
            if (dragItem == nil && [[sender view] isKindOfClass:[DashboardWidgetItem class]]) {
                dragItem = (DashboardWidgetItem*)[sender view];
                positionOrigin = [self.items indexOfObject:dragItem];
            }
            break;
        case UIGestureRecognizerStateChanged:
            if (dragItem) {
                origin = [sender locationInView:self.scrollView];
                column = round((origin.x - ICON_WIDTH / 2) / ICON_WIDTH);
                if (column != positionOrigin && [[self.items objectAtIndex:column] isKindOfClass:[DashboardWidgetItem class]]) {
                    [self swapItemFrom:positionOrigin to:column];
                    positionOrigin = column;
                }
            }
            break;
        case UIGestureRecognizerStateEnded:
            dragItem = nil;
            positionOrigin = -1;
            break;
    }
}

- (void)buttonHold:(UIGestureRecognizer *)sender {
    CGPoint origin;
    NSInteger column;

    switch (sender.state) {
        case UIGestureRecognizerStateBegan:
            if (self.editing) {
                [self endEditing];
            }else{
                [self beginEditing];
                
                if (dragItem == nil && [[sender view] isKindOfClass:[DashboardWidgetItem class]]) {
                    dragItem = (DashboardWidgetItem*)[sender view];
                    positionOrigin = [self.items indexOfObject:dragItem];
                }
            }
            break;
        case UIGestureRecognizerStateChanged:
            if (dragItem) {
                origin = [sender locationInView:self.scrollView];
                column = round((origin.x - ICON_WIDTH / 2) / ICON_WIDTH);
                if (column != positionOrigin && [[self.items objectAtIndex:column] isKindOfClass:[DashboardWidgetItem class]]) {
                    [self swapItemFrom:positionOrigin to:column];
                    positionOrigin = column;
                }
            }
            break;
        case UIGestureRecognizerStateEnded:
            dragItem = nil;
            positionOrigin = -1;
            break;
    }
}

#pragma mark -
#pragma mark UIAlertViewDelegate Protocol
- (void)alertView:(UIAlertView *)alertView clickedButtonAtIndex:(NSInteger)buttonIndex {
    NSString *tmpPath = [NSTemporaryDirectory() stringByAppendingPathComponent:@"widget"];
    NSArray *bundleWidgets = [NSBundle pathsForResourcesOfType:@"wdgt" inDirectory:tmpPath];
    NSString *widget = [bundleWidgets lastObject];
    NSString *path = [widget stringByReplacingOccurrencesOfString:[tmpPath stringByAppendingString:@"/"] withString:@""];
    NSString *widgetPath = [[DashboardAppDelegate widgetPath] stringByAppendingPathComponent:path];
    
    // User still wants to install this widget despit warning
    if (buttonIndex == 1) {
        // Try to remove existing widget if there is one
        BOOL overwrite = [[NSFileManager defaultManager] removeItemAtPath:widgetPath error:NULL];
        
        [[NSFileManager defaultManager] moveItemAtPath:widget toPath:widgetPath error:NULL];
        
        // Remove all existing icons if there are any
        if (overwrite) {
            for (DashboardWidgetItem *item in self.items) {
                if ([item isKindOfClass:[DashboardWidgetItem class]] && [item.path isEqualToString:widgetPath]) {
                    [self removeIcon:item];
                }
            }
        }
        
        [self replaceItem:tempDownloadItem withItem:path];
    }else {
        [self removeIcon:tempDownloadItem];
    }
    tempDownloadItem = nil;

    [[NSFileManager defaultManager] removeItemAtPath:tmpPath error:NULL];
}

#pragma mark -
#pragma mark DashboardDownloadItemDelegate Protocol

- (void)downloadItem:(DashboardDownloadItem *)downloadItem didFailWithError:(NSError *)error {
    NSLog(@"%s %@", _cmd, error);
    [self removeIcon:downloadItem];
}

- (void)downloadItem:(DashboardDownloadItem *)downloadItem didFinishWithData:(NSData *)data {
    NSString *widgetPath = [DashboardAppDelegate widgetPath];
    NSString *tmpPath = [NSTemporaryDirectory() stringByAppendingPathComponent:@"widget"];
	NSString *filePath = [tmpPath stringByAppendingPathComponent:@"widget.zip"];
    [[NSFileManager defaultManager] createDirectoryAtPath:tmpPath withIntermediateDirectories:YES attributes:nil error:NULL];
	[[NSFileManager defaultManager] createFileAtPath:filePath contents:data attributes:nil];
	
	ZipArchive *zipArchive = [[ZipArchive alloc] init];
	if ([zipArchive UnzipOpenFile:filePath]) {
        [zipArchive UnzipFileTo:tmpPath overWrite:NO];
	}else {
        [self downloadItem:downloadItem didFailWithError:[NSError errorWithDomain:NSCocoaErrorDomain code:NSFileReadCorruptFileError userInfo:nil]];
        goto FINISH;
    }
    
    // Move all valid widgets to widgetPath
    NSArray *bundleWidgets = [NSBundle pathsForResourcesOfType:@"wdgt" inDirectory:tmpPath];
    NSString *widget = [bundleWidgets lastObject];
    NSBundle *widgetBundle = [NSBundle bundleWithPath:widget];
    NSString *name = [widgetBundle objectForInfoDictionaryKey:@"CFBundleDisplayName"];
    NSString *path = [widget stringByReplacingOccurrencesOfString:[tmpPath stringByAppendingString:@"/"] withString:@""];
    
    // Hack for stupid widget dev that can't name Info.plist or didn't include a correct key
    if (!name) {
        name = [path stringByReplacingOccurrencesOfString:@".wdgt" withString:@""];
    }

    // Check for duplicates
    if ([[NSFileManager defaultManager] fileExistsAtPath:[widgetPath stringByAppendingPathComponent:path]]) {
        UIAlertView *alert = [[UIAlertView alloc] initWithTitle:[NSString stringWithFormat:@"Warning: installing %@", name] message:@"You already have this widget, do you still want to install again?" delegate:self cancelButtonTitle:@"Cancel" otherButtonTitles:@"Install", nil];
        tempDownloadItem = downloadItem;
        [[alert autorelease] show];
        goto WARNING;
    }
    
    // Check for native plugin
    if ([[NSBundle pathsForResourcesOfType:@"widgetplugin" inDirectory:widget] count] > 0 || [[NSBundle pathsForResourcesOfType:@"bundle" inDirectory:widget] count] > 0) {
        UIAlertView *alert = [[UIAlertView alloc] initWithTitle:[NSString stringWithFormat:@"Warning: installing %@", name] message:@"This widget contains native plugin and will likely not work on this device, do you still want to install?" delegate:self cancelButtonTitle:@"Cancel" otherButtonTitles:@"Install", nil];
        tempDownloadItem = downloadItem;
        [[alert autorelease] show];
        goto WARNING;
    }
    
    [[NSFileManager defaultManager] moveItemAtPath:widget toPath:[widgetPath stringByAppendingPathComponent:path] error:NULL];
    
    // Replace DownloadItem with WidgetItem
    [self replaceItem:downloadItem withItem:path];
    
FINISH:
    [[NSFileManager defaultManager] removeItemAtPath:tmpPath error:NULL];
WARNING:
    [zipArchive release];
}

#pragma mark -
#pragma mark Icon Management

- (DashboardWidgetItem *)addIcon:path withFrame:(CGRect)frame {
    NSString *widgetsPath = [[DashboardAppDelegate widgetPath] stringByAppendingPathComponent:path];
    
    [DashboardWidgetsView replacePathOfType:@"html" inDirectory:widgetsPath];
    
    NSString *iconPath = [widgetsPath stringByAppendingPathComponent:@"Icon.png"];
    UIImage *icon = [UIImage imageWithContentsOfFile:iconPath];
    
    DashboardWidgetItem *item = [[DashboardWidgetItem alloc] initWithFrame:frame image:icon path:widgetsPath];
    
    UILongPressGestureRecognizer *holdGesture = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(buttonHold:)];
    [item addGestureRecognizer:holdGesture];
    [holdGesture release];
    item.dragGesture = [[NSClassFromString(@"UIDragRecognizer") alloc] initWithTarget:self action:@selector(buttonDrag:)];
    [item.icon addTarget:self action:@selector(addWidget:) forControlEvents:UIControlEventTouchUpInside];
    
    [item.closeButton addTarget:self action:@selector(removeItem:) forControlEvents:UIControlEventTouchUpInside];
    
    [self.scrollView addSubview:item];
        
    return [item autorelease];
}

- (void)removeIcon:(id)item {
    NSInteger i = [self.items indexOfObject:item];
    if (i == NSNotFound) {
        return;
    }
    
    [item removeFromSuperview];
    [self.items removeObjectAtIndex:i];
    [self.paths removeObjectAtIndex:i];
    
    // Re-order widgets
    [UIView beginAnimations:nil context:nil];
    [UIView setAnimationDuration:0.5];
    
    for (; i < [self.items count]; i++) {
        UIView *view = [self.items objectAtIndex:i];
        CGRect viewFrame = view.frame;
        viewFrame.origin.x = ICON_WIDTH * i;
        view.frame = viewFrame;
    }
    self.scrollView.contentSize = CGSizeMake(ICON_WIDTH * [self.items count], self.bounds.size.height);
    
    [UIView commitAnimations];
}

#pragma mark -
#pragma mark Item Management

- (void)swapItemFrom:(NSInteger)i to:(NSInteger)j {
    [UIView beginAnimations:nil context:nil];
    [UIView setAnimationDuration:0.2];
    
    NSString *path = [[self.paths objectAtIndex:i] retain];
    [self.paths replaceObjectAtIndex:i withObject:[self.paths objectAtIndex:j]];
    [self.paths replaceObjectAtIndex:j withObject:path];
    [path release];
    
    DashboardWidgetItem *item = [[self.items objectAtIndex:i] retain];
    [self.items replaceObjectAtIndex:i withObject:[self.items objectAtIndex:j]];
    [self.items replaceObjectAtIndex:j withObject:item];
    [item release];

    CGRect itemFrame = item.frame;
    itemFrame.origin.x = ICON_WIDTH * j;
    item.frame = itemFrame;
    item = [self.items objectAtIndex:i];
    itemFrame = item.frame;
    itemFrame.origin.x = ICON_WIDTH * i;
    item.frame = itemFrame;
    
    [UIView commitAnimations];
}

- (void)replaceItem:(DashboardDownloadItem*)downloadItem withItem:(NSString*)path {
    DashboardWidgetItem *item = [self addIcon:path withFrame:downloadItem.frame];
    NSUInteger i = [self.items indexOfObject:downloadItem];

    [downloadItem removeFromSuperview];
    [self.paths replaceObjectAtIndex:i withObject:path];
    [self.items replaceObjectAtIndex:i withObject:item];

    [self.scrollView scrollRectToVisible:item.frame animated:YES];
}

- (void)addItem:(NSURLRequest *)request {
    DashboardDownloadItem *item = [[DashboardDownloadItem alloc] initWithFrame:CGRectMake(ICON_WIDTH * [self.items count], 0.0, ICON_WIDTH, self.bounds.size.height) request:request delegate:self];
    
    [self.paths addObject:PLACEHOLDER];
    [self.items addObject:item];
    [self.scrollView addSubview:item];

    self.scrollView.contentSize = CGSizeMake(ICON_WIDTH * [self.items count], self.bounds.size.height);
    [self.scrollView scrollRectToVisible:item.frame animated:YES];
    
    [item start];
    [item release];
}

- (void)removeItem:(id)sender {
    if ([sender isKindOfClass:[UIButton class]] && [[sender superview] isKindOfClass:[DashboardWidgetItem class]]) {
        DashboardWidgetItem *item = (DashboardWidgetItem*)[sender superview];

        NSString *path = item.path;
        NSBundle *widgetBundle = [NSBundle bundleWithPath:path];
        NSString *bundleIdentifier = [widgetBundle bundleIdentifier];
        
        if (bundleIdentifier) {
            // Remove opening widgets
            [delegate itemDidRemove:bundleIdentifier];
            
            // Clear preferences
            for (NSString *key in [[NSUserDefaults standardUserDefaults] dictionaryRepresentation]) {
                if ([key hasPrefix:bundleIdentifier]) {
                    [[NSUserDefaults standardUserDefaults] removeObjectForKey:key];
                }
            }
        }
        
        // Delete widget files
        [[NSFileManager defaultManager] removeItemAtPath:path error:NULL];
        
        // Remove icon
        [self removeIcon:item];
    }
}

#pragma mark -
#pragma mark scrollView

- (void)showScrollView:(BOOL)animated {
	CGRect scrollViewFrame = self.bounds;
    scrollViewFrame.origin.x -= [self superview].frame.size.width;
	self.scrollView.frame = scrollViewFrame;
	
    if (animated) {
        [UIView beginAnimations:@"ShowScrollView" context:NULL];
        [UIView setAnimationDuration:0.6];
    }
	
	scrollViewFrame = self.scrollView.frame;
    scrollViewFrame.origin.x += [self superview].frame.size.width;
	self.scrollView.frame = scrollViewFrame;
    
    if (animated) {
        [UIView commitAnimations];
    }
}

- (void)hideScrollView:(BOOL)animated {
	self.scrollView.frame = self.bounds;
	
    if (animated) {
        [UIView beginAnimations:@"HideScrollView" context:NULL];
        [UIView setAnimationDuration:0.6];
    }
	
	CGRect scrollViewFrame = self.scrollView.frame;
    scrollViewFrame.origin.x -= [self superview].frame.size.width;
	self.scrollView.frame = scrollViewFrame;
    
    if (animated) {
        [UIView commitAnimations];
    }
    
    if (self.editing) {
        [self endEditing];
    }
}

- (void)dealloc {
    self.paths = nil;
    self.items = nil;
	self.backgroundView = nil;
	self.scrollView = nil;
    [super dealloc];
}

@end
