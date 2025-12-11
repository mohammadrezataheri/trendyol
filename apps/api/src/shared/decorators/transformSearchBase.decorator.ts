import { Transform } from 'class-transformer';

type transformType = 'maxResult' | 'skipCount';

const TransformSearchBase = (type: transformType) => {
  if (type == 'maxResult') {
    return Transform(({value}) => {
      const maxResult = value ? value * 1 : 10;
      return maxResult;
    });
  } else {
    return Transform(({value}) => {

      const skipCount = value ? value * 1 : 1;
      return skipCount;
    });
  }
};

export default TransformSearchBase;
