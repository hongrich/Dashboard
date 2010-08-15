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

@synthesize title, url, height, width, prefHtml, parsingEnum;

- (DashboardGadget*) initWithUrl:(NSString*) aUrl {
    if ((self = [super init])) {
        // Default settings
        self.height = 100;
        self.width = 300;
        self.url = aUrl;
        self.prefHtml = [NSString string];
        self.parsingEnum = NO;
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
    [plist setValue:[@"com.gadget." stringByAppendingString:[self.title stringByReplacingOccurrencesOfString:@" " withString:@""]] forKey:@"CFBundleIdentifier"];
    [plist setValue:@"gadget.html" forKey:@"MainHTML"];
    // TODO: Figure out width somehow
    [plist setValue:[NSNumber numberWithInt:(self.width + GADGET_PADDING)] forKey:@"Width"];
    [plist setValue:[NSNumber numberWithInt:(self.height + GADGET_PADDING)] forKey:@"Height"];
    [plist writeToFile:[widgetDir stringByAppendingPathComponent:@"Info.plist"] atomically:NO];
    // Copy over gadget.html
    [[NSFileManager defaultManager] copyItemAtPath:[[NSBundle mainBundle] pathForResource:@"gadget" ofType:@"html"] toPath:[widgetDir stringByAppendingPathComponent:@"gadget.html"] error:NULL];

    NSStringEncoding enc;
    NSString *file = [NSString stringWithContentsOfFile:[widgetDir stringByAppendingPathComponent:@"gadget.html"] usedEncoding:&enc error:NULL];
    // Change iframe src
    NSString *server = [[NSUserDefaults standardUserDefaults] stringForKey:@"preference_opensocial_server"];
    NSString *src = [[server stringByAppendingString:@"/gadgets/ifr?url="] stringByAppendingString: self.url];
    file = [file stringByReplacingOccurrencesOfString:@"src=\"inner.html\"" withString:[NSString stringWithFormat:@"src=\"%@\"", src]];
    // Change dimension
    file = [file stringByReplacingOccurrencesOfString:@"var frontWidth = 250;" withString:[NSString stringWithFormat:@"var frontWidth = %d;", self.width]];
    file = [file stringByReplacingOccurrencesOfString:@"var frontHeight = 70;" withString:[NSString stringWithFormat:@"var frontHeight = %d;", self.height]];
    // Add more UserPrefs
    file = [file stringByReplacingOccurrencesOfString:@"<!-- UserPref Section -->" withString:self.prefHtml];

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
        if ([attributeDict objectForKey:@"directory_title"] != nil) {
            self.title = [attributeDict valueForKey:@"directory_title"];
        }
        if ([attributeDict objectForKey:@"height"] != nil) {
            self.height = [[attributeDict valueForKey:@"height"] intValue];
        }
        if ([attributeDict objectForKey:@"width"] != nil) {
            self.width = [[attributeDict valueForKey:@"width"] intValue];
        }
    } else if ([elementName isEqualToString:@"UserPref"]) {
        NSString *name = [attributeDict valueForKey:@"name"];
        NSString *datatype = [attributeDict valueForKey:@"datatype"];
        NSString *display_name = name;
        if ([attributeDict objectForKey:@"display_name"] != nil) {
            display_name = [attributeDict objectForKey:@"display_name"];
        }
        NSString *urlparam = name;
        if ([attributeDict objectForKey:@"urlparam"] != nil) {
            urlparam = [attributeDict objectForKey:@"urlparam"];
        }
        NSString *default_value = @"";
        if ([attributeDict objectForKey:@"default_value"] != nil) {
            default_value = [attributeDict objectForKey:@"default_value"];
        }
        // TODO: support 'required'

        self.prefHtml = [self.prefHtml stringByAppendingFormat:@"<label for='UserPref_%@'>%@</label>", name, display_name];
        // TODO: support bool, hidden and list types
        // datatype defaults to string if not specified
        if (datatype == nil || [datatype isEqualToString:@"string"]) {
            self.prefHtml = [self.prefHtml stringByAppendingFormat:@"<input id='UserPref_%@' urlparam='%@' value='%@' type='text' size='17'>", name, urlparam, default_value];
        } else if ([datatype isEqualToString:@"enum"]) {
            self.prefHtml = [self.prefHtml stringByAppendingFormat:@"<select id='UserPref_%@' urlparam='%@' value='%@'>", name, urlparam, default_value];
            self.parsingEnum = YES;
        }
    } else if (self.parsingEnum == YES && [elementName isEqualToString:@"EnumValue"]) {
        NSString *value = [attributeDict valueForKey:@"value"];
        NSString *display_value = value;
        if ([attributeDict objectForKey:@"display_value"] != nil) {
            display_value = [attributeDict objectForKey:@"display_value"];
        }
        self.prefHtml = [self.prefHtml stringByAppendingFormat:@"<option value='%@'>%@</option>", value, display_value];
    }
}

- (void)parser:(NSXMLParser *)parser didEndElement:(NSString *)elementName namespaceURI:(NSString *)namespaceURI qualifiedName:(NSString *)qName {
    if (self.parsingEnum == YES && [elementName isEqualToString:@"UserPref"]) {
        self.parsingEnum = NO;
        self.prefHtml = [self.prefHtml stringByAppendingString:@"</select>"];
    }
}

- (void) dealloc {
    self.title = nil;
    self.url = nil;
    self.prefHtml = nil;
    [super dealloc];
}

@end
