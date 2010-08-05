//
//  DashboardGadget.m
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

#import "DashboardGadget.h"


@implementation DashboardGadget

@synthesize title, url, height, width;

- (DashboardGadget*) initWithUrl:(NSString*) aUrl {
    if ((self = [super init])) {
        // Default settings
        self.height = 100;
        self.width = 300;
        self.url = aUrl;
    }
    return self;
}

/*!
 * Create .wdgt directory for a google gadget
 * @result Full name of the .wdgt directory created.
 */
- (NSString*) createWidget {
    NSString *widgetPath = [DashboardAppDelegate widgetPath];
    NSString *path = [self.title stringByAppendingString:@".wdgt"];
    NSString *widgetDir = [widgetPath stringByAppendingPathComponent:path];
    // Create widget directory
    [[NSFileManager defaultManager] createDirectoryAtPath:widgetDir withIntermediateDirectories:YES attributes:nil error:NULL];
    // Copy over empty Icon.png and Default.png
    [[NSFileManager defaultManager] copyItemAtPath:[[NSBundle mainBundle] pathForResource:@"DashboardIcon" ofType:@"png"] toPath:[widgetDir stringByAppendingPathComponent:@"Icon.png"] error:NULL];
    [[NSFileManager defaultManager] copyItemAtPath:[[NSBundle mainBundle] pathForResource:@"DashboardIcon" ofType:@"png"] toPath:[widgetDir stringByAppendingPathComponent:@"Default.png"] error:NULL];
    // Create Info.plist
    NSMutableDictionary* plist = [NSMutableDictionary dictionary];
    [plist setValue:[NSNumber numberWithBool:YES] forKey:@"AllowFullAccess"];
    [plist setValue:self.title forKey:@"CFBundleDisplayName"];
    [plist setValue:self.title forKey:@"CFBundleName"];
    NSString *identifier = (NSString *)CFUUIDCreateString(NULL, CFUUIDCreate(NULL));
    [plist setValue:[@"com.gadget." stringByAppendingString:identifier] forKey:@"CFBundleIdentifier"];
    [plist setValue:@"gadget.html" forKey:@"MainHTML"];
    // TODO: Figure out width somehow
    [plist setValue:[NSNumber numberWithInt:(self.width + 30)] forKey:@"Width"];
    [plist setValue:[NSNumber numberWithInt:(self.height + 30)] forKey:@"Height"];
    [plist writeToFile:[widgetDir stringByAppendingPathComponent:@"Info.plist"] atomically:NO];
    // Copy over gadget.html
    [[NSFileManager defaultManager] copyItemAtPath:[[NSBundle mainBundle] pathForResource:@"gadget" ofType:@"html"] toPath:[widgetDir stringByAppendingPathComponent:@"gadget.html"] error:NULL];
    // Change iframe src
    NSStringEncoding enc;
    NSString *file = [NSString stringWithContentsOfFile:[widgetDir stringByAppendingPathComponent:@"gadget.html"] usedEncoding:&enc error:NULL];
    NSString *server = [[NSUserDefaults standardUserDefaults] stringForKey:@"preference_opensocial_server"];
    NSString *src = [[server stringByAppendingPathComponent:@"gadgets/ifr?url="] stringByAppendingString: self.url];
    file = [file stringByReplacingOccurrencesOfString:@"src=\"inner.html\"" withString:[NSString stringWithFormat:@"src=\"%@\"", src]];
    [file writeToFile:[widgetDir stringByAppendingPathComponent:@"gadget.html"] atomically:NO encoding:enc error:NULL];
    return path;
}

#pragma mark -
#pragma mark NSXMLParserDelegate Protocol

- (void)parser:(NSXMLParser *)parser didStartElement:(NSString *)elementName
  namespaceURI:(NSString *)namespaceURI qualifiedName:(NSString *)qualifiedName
    attributes:(NSDictionary *)attributeDict {

    if ([elementName isEqualToString:@"ModulePrefs"]) {
        self.title = [attributeDict valueForKey:@"title"];
        if ([attributeDict objectForKey:@"height"] != nil) {
            self.height = [[attributeDict valueForKey:@"height"] intValue];
        }
        if ([attributeDict objectForKey:@"width"] != nil) {
            self.width = [[attributeDict valueForKey:@"width"] intValue];
        }
    }
}

- (void) dealloc {
    self.title = nil;
    self.url = nil;
    [super dealloc];
}

@end
