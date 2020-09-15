import React from 'react';
import { getInitials } from '../../util/getInitials';

interface Props {
  diameter: number;
  name: string;
  pubkey: string;
  colors: Array<string>;
  borderColor: string;
}

interface State {
  sha512Seed?: string;
}

export class AvatarPlaceHolder extends React.PureComponent<Props, State> {
  public constructor(props: Props) {
    super(props);

    this.state = {
      sha512Seed: undefined,
    };
  }

  public componentDidMount() {
    void this.sha512(this.props.pubkey).then((sha512Seed: string) => {
      this.setState({ sha512Seed });
    });
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.name === prevProps.name) {
      return;
    }
    void this.sha512(this.props.name).then((sha512Seed: string) => {
      this.setState({ sha512Seed });
    });
  }

  public render() {
    if (!this.state.sha512Seed) {
      return <></>;
    }

    const { borderColor, colors, diameter, name } = this.props;
    const r = diameter / 2;
    const initial = getInitials(name)?.toLocaleUpperCase() || '0';
    const viewBox = `0 0 ${diameter} ${diameter}`;
    const fontSize = diameter * 0.5;

    // Generate the seed simulate the .hashCode as Java
    const hash = parseInt(this.state.sha512Seed.substring(0, 12), 16) || 0;

    const bgColorIndex = hash % colors.length;

    const bgColor = colors[bgColorIndex];

    return (
      <svg viewBox={viewBox}>
        <g id="UrTavla">
          <circle
            cx={r}
            cy={r}
            r={r}
            fill={bgColor}
            shape-rendering="geometricPrecision"
            stroke={borderColor}
            stroke-width="1"
          />
          <text
            font-size={fontSize}
            x="50%"
            y="50%"
            fill="white"
            text-anchor="middle"
            stroke="white"
            stroke-width={1}
            alignment-baseline="central"
          >
            {initial}
          </text>
        </g>
      </svg>
    );
  }

  private async sha512(str: string) {
    // tslint:disable-next-line: await-promise
    const buf = await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(str)
    );

    // tslint:disable: prefer-template restrict-plus-operands
    return Array.prototype.map
      .call(new Uint8Array(buf), (x: any) => ('00' + x.toString(16)).slice(-2))
      .join('');
  }
}
