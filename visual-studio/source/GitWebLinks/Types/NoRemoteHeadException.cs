#nullable enable

using System;
using System.Runtime.Serialization;

namespace GitWebLinks;

[Serializable]
public class NoRemoteHeadException : Exception {

    public NoRemoteHeadException(string message) : base(message) { }


    protected NoRemoteHeadException(SerializationInfo info, StreamingContext context) : base(info, context) { }

}
