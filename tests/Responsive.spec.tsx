/* eslint-disable no-undef, react/no-multi-comp, react/jsx-curly-brace-presence, max-classes-per-file */
import { fireEvent, render } from '@testing-library/react';
import ResizeObserver from 'rc-resize-observer';
import KeyCode from 'rc-util/lib/KeyCode';
import React from 'react';
import { act } from 'react-dom/test-utils';
import Menu, { MenuItem, SubMenu } from '../src';
import { OVERFLOW_KEY } from '../src/hooks/useKeyRecords';
import { last } from './util';

jest.mock('rc-resize-observer', () => {
  const R = require('react');
  let RO = jest.requireActual('rc-resize-observer');
  RO = RO.default || RO;

  let guid = 0;

  return R.forwardRef((props, ref) => {
    const [id] = R.useState(() => {
      guid += 1;
      return guid;
    });

    global.resizeProps = global.resizeProps || new Map<number, any>();
    global.resizeProps.set(id, props);

    return R.createElement(RO, { ref, ...props });
  });
});

describe('Menu.Responsive', () => {
  beforeEach(() => {
    global.resizeProps = null;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function getResizeProps(): any[] {
    return Array.from(global.resizeProps!.values());
  }

  // MenuItem should support `ref` since HOC may use this
  // https://github.com/ant-design/ant-design/issues/41570
  it('StrictMode warning', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const MyItem = (props: any) => {
      const domRef = React.useRef();

      return (
        <ResizeObserver onResize={() => {}} ref={domRef}>
          <Menu.Item {...props} />
        </ResizeObserver>
      );
    };

    render(
      <React.StrictMode>
        <Menu mode="horizontal">
          <MyItem key="1">Good</MyItem>
        </Menu>
      </React.StrictMode>,
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('ssr render full', () => {
    const { container } = render(
      <Menu mode="horizontal">
        <MenuItem key="light">Light</MenuItem>
        <SubMenu key="bamboo">Bamboo</SubMenu>
        <MenuItem key="little">Little</MenuItem>
      </Menu>,
    );

    expect(container.children).toMatchSnapshot();
  });

  it('show rest', () => {
    const onOpenChange = jest.fn();

    const genMenu = (props?: any) => (
      <Menu
        mode="horizontal"
        activeKey="little"
        onOpenChange={onOpenChange}
        {...props}
      >
        <MenuItem key="light">Light</MenuItem>
        <MenuItem key="bamboo">Bamboo</MenuItem>
        <SubMenu key="home" title="Home">
          <MenuItem key="little">Little</MenuItem>
        </SubMenu>
      </Menu>
    );

    const { container, rerender } = render(genMenu());

    act(() => {
      jest.runAllTimers();
    });

    // Set container width
    act(() => {
      getResizeProps()[0].onResize({} as any, { clientWidth: 41 } as any);
      jest.runAllTimers();
    });

    // Resize every item
    getResizeProps()
      .slice(1)
      .forEach(props => {
        act(() => {
          props.onResize({ offsetWidth: 20 } as any, null);
          jest.runAllTimers();
        });
      });

    // Should show the rest icon
    expect(
      last(container.querySelectorAll('.rc-menu-overflow-item-rest')),
    ).not.toHaveStyle({
      opacity: '0',
    });

    // Should set active on rest
    expect(
      last(container.querySelectorAll('.rc-menu-overflow-item-rest')),
    ).toHaveClass('rc-menu-submenu-active');

    // Key down can open
    expect(onOpenChange).not.toHaveBeenCalled();
    rerender(genMenu({ activeKey: OVERFLOW_KEY }));
    act(() => {
      jest.runAllTimers();
    });

    fireEvent.keyDown(container.querySelector('ul.rc-menu-root'), {
      which: KeyCode.DOWN,
      keyCode: KeyCode.DOWN,
      charCode: KeyCode.DOWN,
    });

    expect(onOpenChange).toHaveBeenCalled();
  });
});
/* eslint-enable */
