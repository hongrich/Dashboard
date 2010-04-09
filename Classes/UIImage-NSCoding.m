//
//  UIImage-NSCoding.m

#import "UIImage-NSCoding.h"
#define kEncodingKey		@"UIImage"

@implementation UIImage(NSCoding)
- (id)initWithCoder:(NSCoder *)decoder
{
	if ((self = [super init]))
	{
		NSData *data = [decoder decodeObjectForKey:kEncodingKey];
		self = [self initWithData:data];
	}
	
	return self;
}
- (void)encodeWithCoder:(NSCoder *)encoder
{
	NSData *data = UIImagePNGRepresentation(self);
	[encoder encodeObject:data forKey:kEncodingKey];
}
@end
