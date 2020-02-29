
export default class ImageUtils {

    public static convertImageToBlob(dataURI): Blob {
        let byteString;
        const dataURITokens = dataURI.split(',');
        if (dataURITokens[0].indexOf('base64') >= 0) {
          byteString = atob(dataURITokens[1]);
        } else {
          byteString = ImageUtils.convertImageToBlob(dataURITokens[1]);
        }
        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ia], {type: 'image/jpeg'});
    }

    public static rotateImage(base64data, degrees = 90): Promise<string> {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.setAttribute('id', 'hidden-canvas');
            canvas.style.display = 'none';
            document.body.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            const image = new Image();
            image.src = base64data;
            image.onload = () => {
                const w = image.width;
                const h = image.height;
                const rads = degrees * Math.PI / 180;
                let c = Math.cos(rads);
                let s = Math.sin(rads);
                if (s < 0) { s = -s; }
                if (c < 0) { c = -c; }
                canvas.width = h * s + w * c;
                canvas.height = h * c + w * s;
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(degrees * Math.PI / 180);
                ctx.drawImage(image, -image.width / 2, -image.height / 2);
                resolve(canvas.toDataURL('image/jpeg'));
                document.body.removeChild(canvas);
            };
            image.onerror = () => {
                reject('Unable to rotate data\n' + image.src);
            };
        });
    }
}
