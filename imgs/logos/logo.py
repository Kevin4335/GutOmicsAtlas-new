import cv2
import numpy as np
from IPython.display import display, Image

logo = cv2.imread('logo_no_dots.png', cv2.IMREAD_UNCHANGED)
masked = cv2.imread('logo_transparant_masked.png', cv2.IMREAD_UNCHANGED)
print(logo.shape)
print(logo.dtype)
print(logo[100][100], logo[-100][-100], logo[152][499])
display(Image(data=cv2.imencode('.png', logo)[1].tobytes()))  # origin

gray = cv2.cvtColor(logo, cv2.COLOR_BGR2GRAY)
print(gray.shape)
display(Image(data=cv2.imencode('.png', gray)[1].tobytes()))  # gray
print(gray[100][100], gray[-100][-100], gray[152][499])
print(np.min(gray), np.max(gray))
print(np.average(gray[0:100]), np.average(gray[-100:]), np.average(logo[:, 0:100]), np.average(logo[:, -100:]))  # 212

# if a > 205: return 0 else return (205 - a) / 205 * 255
processed = np.where(gray > 205, 0, (205 - gray) / 205 * 255).astype(np.uint8)
# processed = 255 - processed
display(Image(data=cv2.imencode('.png', processed)[1].tobytes()))  # processed

# save as transparent png
png = np.zeros((logo.shape[0], logo.shape[1], 4), dtype=np.uint8)
png[:, :, 2] = 255  # R
png[:, :, 1] = 255  # G
png[:, :, 0] = 255  # B

# if masked is green, change to yellow
green_mask = (masked[:, :, 1] == 255)
png[green_mask, 2] = 255
png[green_mask, 1] = 255
png[green_mask, 0] = 0
png[green_mask, 3] = 255

# if masked is red, change to yellow
red_mask = (masked[:, :, 2] == 255)
# png[red_mask, 2] = 255
# png[red_mask, 1] = 255
# png[red_mask, 0] = 0




png[:, :, 3] = processed
png[green_mask, 3] = 255 * (png[green_mask, 3] >= 128) + png[green_mask, 3] * (png[green_mask, 3] < 128) * 2
cv2.imwrite('logo_processed.png', png)
display(Image(data=cv2.imencode('.png', png)[1].tobytes()))  # processed