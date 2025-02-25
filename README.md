Glue
====

This is yet another [DI](https://en.wikipedia.org/wiki/Dependency_injection) container
for Javascript/Typescript. The goal of this library is to stay out of the way of your
code.


Installation
------------

### To use as a package in your project,

``` bash
npm i @carlosv2/glue
```


Usage
-----

Simply create as many YAML files as needed. Those files will be collected and piled up
to compose a single container service. Be aware that the order in which the files are
piled up is very important as the latest files will override colliding ids.

Each YAML file can contain a combination of the following keys (they all are optional):

- extends
- parameters
- services


### Extends

If set, this key must contain an array of relative paths pointing at other YAML files.
The loader will load those paths and apply ther contents into the file with the `extends`
key as if the contents had been declared on it.


### Parameters

If set, this key must contain a key/value object defining parameters that can be used on
other parameters and/or services, or can be [pulled directly from the container](#container).

Each parameter value can be declared with any [valid value](#values).


### Services

If set, this key must contain a key/value object defining services that can be used on
other parameters and/or services, or can be [pulled directly from the container](#container).

Each service value must be either an string or an object.

When a service is defined as an string, it is considered to be an alias. This is, the service
points at the service pointed in the string.

When a service is defined as an object, the following keys are expected:

- symbol: Mandatory. A [value](#values) resulting in an object
- args: Optional. A list of [values](#values) in the same order as the expected arguments.
- factory: Optional. A [value](#value) resulting in the name of a method in the symbol's object.
- property: Optional. A [value](#value) resulting in the name of a property in the symbol's object.
- calls: Optional. A list of [calls](#call) to be executed on the resulting instance.
- tags: Optional. A list of strings with the tags associated to the service.
- scope: Optional. A free-form string with the name of the context this service belongs to.

Please, bear in mind that ehe `factory` and `property` keys are mutually exclusive.


Values
------

A value is any data of any type (including objects of any depth and array). They can also be
evaluated dynamically on runtime. In order to evaluate values on runtime, they must be
defined as an string with one of the following leading characters:

- `<`: This returns the associated service. For example, the following YAML file:
    ``` yaml
    services:
      my.dependency:
        symbol: '(my/dependency.ts)~'

      my.service:
        symbol: '(my/service)~'
        args: ['<my.dependency']
    ```
    Will inject the `my.dependency` service as argument to the `my.service` service.
- `$`: This returns the associated parameter. For example, the following YAML file:
    ``` yaml
    parameters:
      name: glue

    services:
      my.service:
        symbol: '(my/service)~'
        args: ['$name']
    ```
    Will inject the `name` parameter as argument to the `my.service` service.
- `>`: This returns an array of services containing the given tag. For example, the following YAML file:
    ``` yaml
    services:
      my.child1:
        symbol: '(my/child1.ts)~'
        tag: ['children']

      my.child2:
        symbol: '(my/child2.ts)~'
        tag: ['children']

      my.parent:
        symbol: '(my/parent)~'
        args: ['>children']
    ```
    Will be interpreted as `['<my.child1', '<my.child2']` as the argument to the `my.parent` service.
- `}`: This returns an object of services where the keys are the ids and the values are the instances.
    ``` yaml
    services:
      my.child1:
        symbol: '(my/child1.ts)~'
        tag: ['children']

      my.child2:
        symbol: '(my/child2.ts)~'
        tag: ['children']

      my.parent:
        symbol: '(my/parent)~'
        args: ['}children']
    ```
    Will be interpreted as `{'my.child1': '<my.child1', 'my.child2': '<my.child2'}` as the argument to the `my.parent` service.
- `%`: This returns the environment variable. It has the format `%<name>[/<type>[/<fallback>]]` where:
    - `name`: Name of the environment variable
    - `type`: Type the environemnt variable will be interepreted on. It must be one of:
        - `s`: string
        - `b`: boolean
        - `n`: number
    - `fallback`: Fallback value in case the environment variable is not found
    For example, given the environment variable `MY_VAR=4`, the following YAML file:
    ``` yaml
    parameters:
      var1: '%MY_VAR'
      var2: '%MY_VAR/n'
      var3: '%MY_VAR/n/5'
      var4: '%MY_OTHER_VAR'
      var5: '%MY_OTHER_VAR/n/5'
    ```
    Will create the parameter `var1` with value `'4'` (as string), the `var2` with value `4` (as number),
    the `var3` with value `4` (as number), the `var5` with value `5` (as number). Note that the definition
    for `var4` will produce an exception because the environment variable `MY_OTHER_VAR` is not found.
- `!`: This returns the evaluation of the code. For example, the following YAML file:
    ``` yaml
    parameters:
      now: '!Date.now()'
    ```
    Will create the parameter `now` with the current timestamp.
- `(`: This imports an object from the given relative path according to the [termination](#terminations).
- `[`: This imports an array of objects from the given relative pattern according to the [termination](#terminations).
    The `*` character is allowed as a placeholder for a single directory while the `**` characters are allowed
    as a placeholder for any amount of nested directories.

Service definitions are also valid values thus allowing service definitions to have other service definitions
nested.

Parameter interpolation
-----------------------

String values are allowed to have placeholders pointing to other values. Those placeholders will be evaluated
during run time and replaced with the parameters they point at.

In order to interpolate parameters, the placeholder must be surrounded like this `@{placeholder}`.

For example:
``` yaml
parameters:
  library: glue
  opinion: '@{library} is awesome!'
```

When pulling the `option` parameter, the container will return `glue is awesome!`.

If interpolation is not desired, it can be escaped with `\`.

For example:
``` yaml
parameters:
  placeholder: parameter
  message: 'You can replace any \@{placeholder} found in a @{placeholder}'
```

When pulling the `message` parameter, the container will return `You can replace any @{placeholder} found in a parameter`.


Terminations
------------

When using the `(` and `[` leading characters on a value, the termination will determine
what will be imported:

- No termination: Will import the entire module. For example, the following YAML file:
    ``` yaml
    parameters:
      obj: '(my/path.ts'
    ```
    Will be interpreted as `import * as obj from 'my/path';`
- `)`: Will import the default object from the module. For example, the following YAML file:
    ``` yaml
    parameters:
      obj: '(my/path.ts)'
    ```
    Will be interpreted as `import obj from 'my/path';`
- `)<name>`: Will import the named object from the module. For example, the following YAML file:
    ``` yaml
    parameters:
      obj: '(my/path.ts)MyObj'
    ```
    Will be interpreted as `import { MyObj } from 'my/path';`
- `)~`: Will import the only exported object in the file. If more than 1 object is exported,
    an error will be raised. For example, given the following `my/path.ts` file:
    ``` ts
    function addition(a: number, b: number): number {
        return a + b;
    }

    export const value = addition(4, 5);
    ```
    Then, the following YAML file:
    ``` yaml
    parameters:
      obj: '(my/path.ts)~'
    ```
    Will be interpreted as `import { value } from 'my/path';`
- `)~<type>`: Will import the only exported object of the maching type in the file. If more than
    1 object of the requested type is exported, an error will be raised. Currently only the
    following types are accepted:
    - `class`: For classes
    - `func`: For functions
    For example, given the following `my/path.ts` file:
    ``` ts
    export function addition(a: number, b: number): number {
        return a + b;
    }

    export const value = addition(4, 5);
    ```
    Then, the following YAML file:
    ``` yaml
    parameters:
      obj: '(my/path.ts)~func'
    ```
    Will be interpreted as `import { addition } from 'my/path';`


Container
---------

The container object implements the following methods:

- `get<T = unknown>(id: string): Promise<T>`: It returns the service pointed by `id`.
- `getParameter<T = unknown>(id: string): Promise<T>`: It returns the parameter pointed by `id`.
- `findServiceIdsByTag(tag: string): string[]`: It returns a list of service ids containing the `tag`.


To-Do
-----

The following is a non-exhaustive list of tasks to be done:

- [ ] Improve the documentation (add documentation for loading contianers)
- [ ] Improve the non-compiled support
