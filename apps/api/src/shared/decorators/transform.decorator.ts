import { Transform } from 'class-transformer';
import slugify from 'slugify';
import _ = require('lodash');
type transformType =
  | 'boolean'
  | 'number'
  | 'checkbox_string'
  | 'checkbox_number'
  | 'slug';

const TransformDecorator = (type: transformType = 'boolean') => {
  switch (type) {
    case 'boolean':
      return Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
      });

    case 'number':
      return Transform(({ value }) => {
        if (value) {
          return Number(value);
        }
        return value;
      });

    case 'checkbox_string':
      return Transform(({ value }) => {
        if (Array.isArray(value)) {
          return value?.map((item) => String(item));
        } else if (
          Object.values(value)?.length &&
          Object.keys(value)?.length &&
          typeof value == 'object'
        ) {
          let arr = [];
          _.forIn(value, (val, key) => {
            arr.push(val);
          });
          return arr;
        } else if (typeof value == 'string') {
          return value?.split(',')?.map((item) => String(item));
        } else {
          return value;
        }
        // if (value && value.length) {
        //   let array;
        //   if (Array.isArray(value)) {
        //     array = value?.map(item => String(item));
        //   } else {
        //     array = value?.split(',')?.map(item => String(item));
        //   }
        //   return array;
        // }
        // return value;
      });

    case 'checkbox_number':
      return Transform(({ value }) => {
        console.log(value);
        if (Array.isArray(value)) {
          return value?.map((item) => Number(item));
        } else if (
          Object.values(value)?.length &&
          Object.keys(value)?.length &&
          typeof value == 'object'
        ) {
          let arr = [];
          _.forIn(value, (val, key) => {
            arr.push(val);
          });
          return arr;
        } else if (typeof value == 'string') {
          return value?.split(',')?.map((item) => Number(item));
        } else {
          return value;
        }

        // if (value && value.length) {
        //   let array;
        //   if (Array.isArray(value)) {
        //     array = value?.map(item => Number(item));
        //   } else {
        //     array = value?.split(',')?.map(item => Number(item));
        //   }
        //   return array;
        // }
        // return value;
      });

    case 'slug':
      return Transform(({ value }) => slugify(value, '_'));
  }
};

export default TransformDecorator;
